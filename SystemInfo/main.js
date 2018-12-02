const { app, BrowserWindow } = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 350,//334,
        height: 500,//180,
        maximizable: true, frame: false, transparent: true
    });
    var id = mainWindow.id;

    mainWindow.loadFile('index.html');

    mainWindow.webContents.openDevTools({ mode: "undocked" });

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null
    })
}

app.on('ready', createWindow)

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
