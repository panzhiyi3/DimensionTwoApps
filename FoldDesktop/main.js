const electron  = require("electron");
const { app, BrowserWindow, ipcMain, nativeImage } = electron;
const fs = require("fs");
const Path = require("path");

const ffi = require("ffi");
const ref = require("ref");
const chokidar = require("chokidar");
const ICO = require("icojs");
const ElectronStore = require("electron-store");
const electronStore = new ElectronStore();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let timerIdResized = 0;

let windowCollapsed = false;

let currentPath = Path.dirname(require.main.filename || process.mainModule.filename);
let watchingPaths = [];
let libDimensionDesk = null;

// https://github.com/electron/electron/blob/master/docs/api/frameless-window.md
// https://github.com/electron/electron/issues/1335
//app.disableHardwareAcceleration(); // This will enable mouse click through

function createWindow() {
    let display = electron.screen.getPrimaryDisplay();
    let winRect = {
        x: display.workArea.x - 5, // Minus 5,for there is a boder frame on the window, and cannot be remove, so skip 5px for border
        // the window border don't generate mouse event, it made "hoverbar" useless
    
        y:display.workArea.y,
        width: display.workArea.width / 2,
        height: display.workArea.height
    };
    if(electronStore.get("bounds")) {
        let bounds = electronStore.get("bounds");
        winRect.x = bounds.x;
        winRect.y = bounds.y;
        winRect.width = bounds.width;
        winRect.height = bounds.height;
    }

    // DimensionTwo will reset windows pos to (0,0) at first time, set pos back ourself
    setTimeout(updateWindowPos, 1000)
    setTimeout(updateWindowPos, 4000)

    mainWindow = new BrowserWindow({
        title: "Fold Desktop",
        x: winRect.x,
        y: winRect.y,
        width: winRect.width,
        height: winRect.height,
        resizable: false,
        maximizable: false,
        minimizable: false,
        frame: false,
        thickFrame: false,
        transparent: true
    });

    mainWindow.loadFile("index.html");

    //mainWindow.webContents.openDevTools({mode: "undocked"});
    
    mainWindow.on("move", function() {
        if(mainWindow != null) {
            windowMovedOrResized();
        }
    })

    mainWindow.on("resize", function() {
        if(mainWindow != null) {
            windowMovedOrResized();
        }
    })

    mainWindow.on("closed", function () {
        mainWindow = null;
    });

    mainWindow.webContents.on("did-finish-load", () => {
        init(mainWindow);
    });
}

function windowMovedOrResized() {
    if(windowCollapsed)
        return;

    if(timerIdResized) {
        clearTimeout(timerIdResized);
    }
    timerIdResized = setTimeout(function() {
        let bounds = mainWindow.getBounds();
        mainWindow.webContents.send("StoreWindowBounds", bounds); // Let Renderer process write config file, don't write in two processes
    }, 500);
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
    libDimensionDesk.UnInit();
    if (process.platform !== "darwin") {
        app.quit();
    }
})

app.on("activate", function () {
    if (mainWindow === null) {
        createWindow();
    }
})

function init(mainWindow) {
    try {
        // If run as asar package, ffi cannot read file in .asar archive, so we have to put the dll file outside
        if(Path.win32.extname(currentPath).toLocaleLowerCase() == ".asar")
        {
            currentPath = Path.dirname(currentPath);
        }

        libDimensionDesk = ffi.Library(currentPath + "\\DimensionDeskHelper64", {
                "Init": ["void", []],
                "UnInit": ["void", []],
                "GetCurrentDesktopPath": [ "int", ["char *", "int", "int *" ] ],
                "GetAllUsersDesktopPath": [ "int", ["char *", "int", "int *" ] ],
                "GetFileIconToBuffer": [ "int", ["string", "int", "char *", "int", "int *"] ],
                "IsHiddenFile": ["int", ["string"]],
                "IsShowHiddenFiles": ["int", []],
                "IsShowFileExtName": ["int", []],
                "ShowFileContextMenu": ["int", ["char *", "int", "string"]],
                "ShellDeleteFile": ["int", ["char *", "int", "string", "bool"]]
            });
    } catch (error) {
        app.quit();
        return;
    }

    libDimensionDesk.Init();

    watchingPaths = getDesktopPath();
    if(!watchingPaths) {
        console.log("Error getting system desktop path, exit!");
        return;
    }

    ipcMain.on("RefreshFiles", refreshFiles);

    ipcMain.on("GetFileIcon", (event, file) => {
        onGetFileIcon(event, file);
    });

    ipcMain.on("FileContextMenu", (event, str) => {
        onFileContextMenu(str);
    });

    ipcMain.on("DeleteFile", (event, str) => {
        onDeleteFile(str);
    });

    ipcMain.on("Fold", foldWindow);

    ipcMain.on("Expand", expandWindow);

    ipcMain.on("ResetWindowBounds", resetWindowBounds);

    var watcher = chokidar.watch(watchingPaths,
        {
            ignoreInitial: true,
            depth: 0
        });
    watcher.on("add", function (path) {
        let file = getOneFileInfo(Path.basename(path), path);
        mainWindow.webContents.send("FileAdd", JSON.stringify(file));
    })
    .on("change", function (path) {
        let file = getOneFileInfo(Path.basename(path), path);
        mainWindow.webContents.send("FileModified", JSON.stringify(file));
    })
    .on("unlink", function (path) {
        mainWindow.webContents.send("FileDel", path);
    })
    .on("addDir", function (path) {
        let file = getOneFileInfo(Path.basename(path), path);
        mainWindow.webContents.send("DirectoryAdd", JSON.stringify(file));
    })
    .on("unlinkDir", function (path) {
        mainWindow.webContents.send("DirectoryDel", path);
    })
    .on("error", function (error) {
        mainWindow.webContents.send("WatcherError", error);
    });

    refreshFiles();
}

function refreshFiles() {
    let fileList = [];

    refreshFileShowMode();

    for(let i = 0; i < watchingPaths.length; i++) {
        traversePath(watchingPaths[i], fileList);
    }

    mainWindow.webContents.send('FileListReady', fileList);

    retriveItemsIcon(fileList);
}

function refreshFileShowMode() {
    let isShowHiddenFiles = libDimensionDesk.IsShowHiddenFiles() ? true : false;
    let isShowFileExtName = libDimensionDesk.IsShowFileExtName() ? true : false;
    mainWindow.webContents.send('RefreshFileShowMode', JSON.stringify(
        {"isShowHiddenFiles":isShowHiddenFiles, "isShowFileExtName":isShowFileExtName}
    ));
}

function getDesktopPath() {
    let bufferLenth = 260 * 3;
    let sizeNeed = ref.alloc("int");
    let stringBuffer = new Buffer(bufferLenth).fill(0);
    let currentUserPath = "";
    let allUsersPath = "";

    let callret = libDimensionDesk.GetCurrentDesktopPath(stringBuffer, bufferLenth, sizeNeed);
    if(callret == -1)
    {
        bufferLenth = sizeNeed.deref();
        stringBuffer = new Buffer(bufferLenth).fill(0);
        callret = libDimensionDesk.GetCurrentDesktopPath(stringBuffer, bufferLenth, sizeNeed);
    }
    if(callret) {
        currentUserPath = ref.readCString(stringBuffer); // Dll returns utf8 string
    }
    else {
        return null;
    }

    stringBuffer.fill(0);

    callret = libDimensionDesk.GetAllUsersDesktopPath(stringBuffer, bufferLenth, sizeNeed);
    if(callret == -1)
    {
        bufferLenth = sizeNeed.deref();
        stringBuffer = new Buffer(bufferLenth).fill(0);
        callret = libDimensionDesk.GetAllUsersDesktopPath(stringBuffer, bufferLenth, sizeNeed);
    }
    if(callret) {
        allUsersPath = ref.readCString(stringBuffer); // Dll returns utf8 string
    }
    else {
        return null;
    }

    return [currentUserPath, allUsersPath];
}

// get all files and folders
function traversePath(filePath, fileList) {
    let files = fs.readdirSync(filePath);
    if (!files) {
        console.warn(err);
        return false;
    }
    else {
        files.forEach(function (fileName) {
            let thisFilePath = Path.join(filePath, fileName);
            let f = getOneFileInfo(fileName, thisFilePath);
            if(f) {
                fileList.push(f);
            }
        });
    }
    return true;
}

function getOneFileInfo(fileName, filePath) {
    let stats = fs.statSync(filePath);

    if (!stats) {
        console.warn("fs.statSync failed on " + filePath);
        return null;
    }
    else {
        let isDir = stats.isDirectory();

        let f = new Object();
        f.path = filePath;
        f.name = fileName;
        f.isDir = isDir;
        f.isHidden = libDimensionDesk.IsHiddenFile(filePath) ? true : false;
        f.icon = null;
        f.size = stats.size;
        f.birthtime = stats.birthtime;
        f.mtime = stats.mtime;
        return f;
    }
}


function parseComplete(err, thisPath, images) {
    if (err) {
        console.log("Parse ico file failed!");
    }
    else {
        images.forEach(function (image, index) {
            let img = nativeImage.createFromBuffer( Buffer.from(image.buffer) );
            mainWindow.webContents.send('FileIconReady', {"path": thisPath, "icon": img.toDataURL()});
        });
    }
}

function retriveItemsIcon(fileList) {
    for(let i = 0; i < fileList.length; i++) {
        let thisPath = fileList[i].path;
        GetFileIcon(thisPath);
    }
}

function onGetFileIcon(event, str) {
    try {
        let file = eval('(' + str + ')');
        if(file.path) {
            GetFileIcon(file.path);
        }
    }
    catch(err) {
        console.log(err);
    }
}

function GetFileIcon(filePath) {
    let bufferLenth = 307200; // most icons (including 256*256) is less than 300kb
    let bytesNeed = ref.alloc("int");
    let imgBuffer = new Buffer(bufferLenth).fill(0);
    let callret = libDimensionDesk.GetFileIconToBuffer(filePath, 2, imgBuffer, bufferLenth, bytesNeed);

    if (callret == -1) {
        bufferLenth = sizeNeed.deref();
        imgBuffer = new Buffer(bufferLenth).fill(0);
        callret = libDimensionDesk.GetFileIconToBuffer(filePath, 2, imgBuffer, bufferLenth, bytesNeed);
    }
    if (callret) {
        ICO.parse(imgBuffer, "image/png").then(function (images) {
            parseComplete(null, filePath, images);
        }).catch(function (err) {
            parseComplete(err);
        });
    }
}

function onFileContextMenu(str) {
    try {
        let file = eval('(' + str + ')');
        if(file.path) {
            let buf = mainWindow.getNativeWindowHandle();
            libDimensionDesk.ShowFileContextMenu(buf, buf.byteLength, file.path);
        }
    }
    catch(err) {
        console.log(err);
    }
}

function onDeleteFile(str) {
    try {
        let file = eval('(' + str + ')');
        if(file.path) {
            let buf = mainWindow.getNativeWindowHandle();
            libDimensionDesk.ShellDeleteFile(buf, buf.byteLength, file.path, file.forceDelete);
        }
    }
    catch(err) {
        console.log(err);
    }
}

function foldWindow() {
    windowCollapsed = true;
    let size = mainWindow.getContentSize();
    mainWindow.setContentSize(35, size[1]);
}

function expandWindow() {
    windowCollapsed = false;
    let size = mainWindow.getContentSize();
    mainWindow.setContentSize(electron.screen.getPrimaryDisplay().workArea.width / 2, size[1]);
}

function resetWindowBounds() {
    let display = electron.screen.getPrimaryDisplay();
    let winRect = {
        x: display.workArea.x - 5,
        y:display.workArea.y,
        width: display.workArea.width / 2,
        height: display.workArea.height
    };
    mainWindow.setBounds(winRect);
}

function updateWindowPos() {
    let display = electron.screen.getPrimaryDisplay();
    let winRect = {
        x: display.workArea.x - 5,
        y:display.workArea.y,
        width: display.workArea.width / 2,
        height: display.workArea.height
    };

    if(electronStore.get("bounds")) {
        let bounds = electronStore.get("bounds");
        winRect.x = bounds.x;
        winRect.y = bounds.y;
        winRect.width = bounds.width;
        winRect.height = bounds.height;
    }

    mainWindow.setBounds(winRect);
}
