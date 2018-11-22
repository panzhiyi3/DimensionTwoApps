window.$ = window.jQuery = require("./jquery.min");
let mainWin = require("electron").remote.getCurrentWindow();
const {ipcRenderer} = require('electron');

let globalFileList = [];
let orgFileItemElem = $(".item").clone();

init();

ipcRenderer.on('FileListReady', (event, fileList) => {
    onFileListReady(fileList);
  });

function init() {
    $(".item").remove();

    $(".titlebar").children().css("opacity", "0.0");

    // TODO, adjust element range
    window.addEventListener('mousemove', function (e) {
        if (e.target === document.documentElement)
            mainWin.setIgnoreMouseEvents(true, { forward: true });
        else
            mainWin.setIgnoreMouseEvents(false);
    });

    window.onresize = function () {
        $(".background").height(document.documentElement.clientHeight - 11);
    }

    $(".background").height(document.documentElement.clientHeight - 11);

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

function onFileListReady(list) {
    globalFileList = list;
    refreshFiles();
}

function refreshFiles() {
    for (let i = 0; i < globalFileList.length; i++) {
        let elem = orgFileItemElem.clone();
        elem.children(".filename").text(globalFileList[i].name);
        console.log(globalFileList[i].name);

        $(".container").append(elem);
    }
}