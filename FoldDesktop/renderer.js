window.$ = window.jQuery = require("./jquery.min");
let win = require("electron").remote.getCurrentWindow();
let fs = require("fs");
let chokidar = require("chokidar");
let ffi = require("ffi");
let ref = require("ref");
let path = require("path");

let currentPath = path.dirname(require.main.filename || process.mainModule.filename);
console.log(currentPath);

let libDimensionDesk = ffi.Library(currentPath + "\\DimensionDeskHelper64", {
    "GetCurrentDesktopPath": [ "int", ["char *", "int", "int *"] ],
    "GetAllUsersDesktopPath": [ "int", ["char *", "int", "int *"] ]
});

init();

function init() {
    $(".titlebar").children().css("opacity", "0.0");

    window.addEventListener('mousemove', function (e) {
        if (e.target === document.documentElement)
            win.setIgnoreMouseEvents(true, { forward: true });
        else
            win.setIgnoreMouseEvents(false);
    });

    window.onresize = function () {
        $(".background").height(document.documentElement.clientHeight);
        $(".container").height(document.documentElement.clientHeight - $(".titlebar").height() - 10);
    }

    $(".background").height(document.documentElement.clientHeight);
    $(".container").height(document.documentElement.clientHeight - $(".titlebar").height() - 10);

    $(".sidebar-button").click(openSidebar);

    $(".sidebar-closebutton").click(closeSidebar);

    $(".dropbtn").click(function (e) {
        e.stopPropagation();
    });

    $(".caption").click(function(e) {
        e.stopPropagation();
    });

    $(".titlebar").mouseenter(function () {
        $(this).addClass("titlebar-hover");
        $(this).children().css("opacity", "1.0");
    });

    $(".titlebar").mouseleave(function () {
        if(!$(this).hasClass("titlebar-expand")) {
            $(this).removeClass("titlebar-hover");
            $(this).children().css("opacity", "0.0");
        }
    });

    $(".titlebar").click(function () {
        if ($(this).hasClass("titlebar-expand")) {
            $(this).removeClass("titlebar-expand");
            $(this).children(".title-expand_btn").text(">");
        }
        else {
            $(this).addClass("titlebar-expand");
            $(this).children(".title-expand_btn").text("<");
        }
    });

    $("#onMenuSettingClick").click(onMenuSettingClick);
    $("#onMenuCloseClick").click(onMenuCloseClick);


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

    traversePath(paths[0]);
    traversePath(paths[1]);
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
        console.log(currentPath);
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
        console.log(allUsersPath);
    }
    else {
        return null;
    }

    return [currentPath, allUsersPath];
}

function onMenuSettingClick(e) {
    e.stopPropagation();
}

function onMenuCloseClick(e) {
    e.stopPropagation();
}

function openSidebar() {
    if(!$("#sideBar").hasClass("sidenav-expand")) {
        $("#sideBar").addClass("sidenav-expand");
    }
}

function closeSidebar() {
    $("#sideBar").removeClass("sidenav-expand");
}


// get all files and folders
function traversePath(filePath) {
    fs.readdir(filePath, function(err, files) {
        if(err) {
            console.warn(err);
            return null;
        }
        else {
            files.forEach(function(filename) {
                let thisFilePath = path.join(filePath, filename);
                fs.stat(thisFilePath, function(eror, stats) {
                    if(eror) {
                        console.warn("fs.stat failed on " + thisFilePath);
                    }
                    else {
                        let isFile = stats.isFile();
                        let isDir = stats.isDirectory();
                        console.log(thisFilePath);
                    }
                })
            });
        }
    });
}
