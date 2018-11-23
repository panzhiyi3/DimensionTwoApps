const electron  = require('electron');
const { app, BrowserWindow, ipcMain} = electron;
let fs = require("fs");

let ffi = require("ffi");
let ref = require("ref");
let path = require("path");
let chokidar = require("chokidar");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let currentPath = path.dirname(require.main.filename || process.mainModule.filename);
    
let libDimensionDesk = ffi.Library(currentPath + "\\DimensionDeskHelper64", {
    "GetCurrentDesktopPath": [ "int", ["char *", "int", "int *" ] ],
    "GetAllUsersDesktopPath": [ "int", ["char *", "int", "int *" ] ],
    "GetFileIcon": [ "int", [ "string", "int", "int", "char *", "int", "int *"] ]
});

// https://github.com/electron/electron/blob/master/docs/api/frameless-window.md
// https://github.com/electron/electron/issues/1335
//app.disableHardwareAcceleration(); // This will enable mouse click through

function createWindow() {
    let display = electron.screen.getPrimaryDisplay();
    mainWindow = new BrowserWindow({
        x: display.workArea.x,
        y: display.workArea.y,
        width: display.workArea.width / 2,
        height: display.workArea.height,
        resizable: true, maximizable: false, frame: false, transparent: true
    });
    let id = mainWindow.id;

    mainWindow.loadFile('index.html');

    mainWindow.webContents.openDevTools({mode: 'undocked'});

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.webContents.on('did-finish-load', () => {
        init(mainWindow);
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
})

function init(mainWindow) {
    //let paths = getDesktopPath();
    let paths = ["V:\\usb"];
    if(!paths) {
        console.log("Error getting system desktop path, exit!");
        return;
    }

    var watcher = chokidar.watch(paths,
        {
            ignoreInitial: true,
            depth: 0
        });
    watcher.on("add", function (path) {
        console.log(path);
    });

    let fileList = [];

    for(let i = 0; i < paths.length; i++) {
        traversePath(paths[i], fileList);
    }

    mainWindow.webContents.send('FileListReady', fileList);

    retriveItemsIcon(fileList);
}

function getDesktopPath() {
    let bufferLenth = 260 * 3;
    let sizeNeed = ref.alloc("int");
    let stringBuffer = new Buffer(bufferLenth).fill(0);
    let currentPath = "";
    let allUsersPath = "";

    let callret = libDimensionDesk.GetCurrentDesktopPath(stringBuffer, bufferLenth, sizeNeed);
    if(callret == -1)
    {
        bufferLenth = sizeNeed.deref();
        stringBuffer = new Buffer(bufferLenth).fill(0);
        callret = libDimensionDesk.GetCurrentDesktopPath(stringBuffer, bufferLenth, sizeNeed);
    }
    if(callret) {
        currentPath = ref.readCString(stringBuffer); // Dll returns utf8 string
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

    return [currentPath, allUsersPath];
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
            let thisFilePath = path.join(filePath, fileName);
            let stats = fs.statSync(thisFilePath);

            if (!stats) {
                console.warn("fs.statSync failed on " + thisFilePath);
            }
            else {
                let isFile = stats.isFile();
                let isDir = stats.isDirectory();

                let f = new Object();
                f.path = thisFilePath;
                f.name = fileName;
                f.isDir = isDir;
                f.isHidden = false;
                f.icon = null;
                fileList.push(f);
            }
        });
    }
    return true;
}

function retriveItemsIcon(fileList) {
    for(let i = 0; i < fileList.length; i++) {
        let thisPath = fileList[i].path;

        let bufferLenth = 260 * 4;
        let sizeNeed = ref.alloc("int");
        let stringBuffer = new Buffer(bufferLenth).fill(0);
        let callret = libDimensionDesk.GetFileIcon(thisPath, 2, i, stringBuffer, bufferLenth, sizeNeed);

        if(callret == -1)
        {
            bufferLenth = sizeNeed.deref();
            stringBuffer = new Buffer(bufferLenth).fill(0);
            callret = libDimensionDesk.GetFileIcon(thisPath, 2, i, stringBuffer, bufferLenth, sizeNeed);
        }
        if(callret) {
            icoPath = ref.readCString(stringBuffer); // Dll returns utf8 string
            mainWindow.webContents.send('FileIconReady', {"path": thisPath, "icon": icoPath});
        }
        // app.getFileIcon(thisPath, {"size": "large"}, function(error, icon) {
        //     if(!error) {
        //         mainWindow.webContents.send('FileIconeady', {"path": thisPath, "icon": icon.toDataURL()});
        //     }
        // });
    }
}
