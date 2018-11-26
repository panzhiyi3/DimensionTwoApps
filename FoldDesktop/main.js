const electron  = require('electron');
const { app, BrowserWindow, ipcMain, nativeImage } = electron;
const fs = require("fs");

const ffi = require("ffi");
const ref = require("ref");
const path = require("path");
const chokidar = require("chokidar");
const ICO = require("icojs");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let currentPath = path.dirname(require.main.filename || process.mainModule.filename);
    
let libDimensionDesk = ffi.Library(currentPath + "\\DimensionDeskHelper64", {
    "Init": ["void", []],
    "UnInit": ["void", []],
    "GetCurrentDesktopPath": [ "int", ["char *", "int", "int *" ] ],
    "GetAllUsersDesktopPath": [ "int", ["char *", "int", "int *" ] ],
    "GetFileIconToBuffer": [ "int", [ "string", "int", "char *", "int", "int *"] ]
});

// https://github.com/electron/electron/blob/master/docs/api/frameless-window.md
// https://github.com/electron/electron/issues/1335
app.disableHardwareAcceleration(); // This will enable mouse click through

function createWindow() {
    let display = electron.screen.getPrimaryDisplay();
    mainWindow = new BrowserWindow({
        title: "Fold Desktop",

        // Minus 5,for there is a boder frame on the window, and cannot be remove, so skip 5px for border
        // the window border don't generate mouse event, it made "hoverbar" useless
        x: display.workArea.x - 5,
        y: display.workArea.y,
        width: display.workArea.width / 2,
        height: display.workArea.height,
        resizable: false,
        maximizable: false,
        minimizable: false,
        frame: false,
        thickFrame: false,
        transparent: true
    });

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
    libDimensionDesk.UnInit();
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
    libDimensionDesk.Init();

    let paths = getDesktopPath();
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

        let bufferLenth = 307200; // most icons (including 256*256) is less than 300kb
        let bytesNeed = ref.alloc("int");
        let imgBuffer = new Buffer(bufferLenth).fill(0);
        let callret = libDimensionDesk.GetFileIconToBuffer(thisPath, 2, imgBuffer, bufferLenth, bytesNeed);

        if(callret == -1)
        {
            bufferLenth = sizeNeed.deref();
            imgBuffer = new Buffer(bufferLenth).fill(0);
            callret = libDimensionDesk.GetFileIconToBuffer(thisPath, 2, imgBuffer, bufferLenth, bytesNeed);
        }
        if(callret) {
            ICO.parse(imgBuffer, "image/png").then(function (images) {
                parseComplete(null, thisPath, images);
            }).catch(function (err) {
                parseComplete(err);
            });
        }
    }
}
