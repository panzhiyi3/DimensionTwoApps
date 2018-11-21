window.$ = window.jQuery = require("./jquery.min");
let win = require("electron").remote.getCurrentWindow();
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
        $(".container").height(document.documentElement.clientHeight - $(".titlebar").height() - 10);
    }

    $(".container").height(document.documentElement.clientHeight - $(".titlebar").height() - 10);

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
    })
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

    return [allUsersPath];
}

function onMenuSettingClick(e) {
    e.stopPropagation();
}

function onMenuCloseClick(e) {
    e.stopPropagation();
}