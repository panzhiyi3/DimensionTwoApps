window.$ = window.jQuery = require("./jquery.min");
const mainWin = require("electron").remote.getCurrentWindow();
const { ipcRenderer, shell } = require("electron");

let globalFileList = [];
let globalFileListMap = new Map();
let orgFileItemElem = $(".item").clone();

init();

ipcRenderer.on('FileListReady', (event, fileList) => {
    onFileListReady(fileList);
});

ipcRenderer.on('FileIconReady', (event, iconInfo) => {
    onFileIconReady(iconInfo);
});

function init() {
    $(".item").remove();

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

    $(".side-hoverbar-transparent").mouseenter(mouseEnterHoverBar)

    $(".side-hoverbar-transparent").mouseleave(mouseLeaveHoverBar);

    $(".sidebar-button").click(openSidebar);

    $("#sidebar-closebutton").click(closeSidebar);

    $("#sidebar-settingbutton").click(onSideBarSetting);

    $("#sidebar-quitbutton").click(quit);
}

function mouseEnterHoverBar() {
    if(!$(".background").hasClass("background-hover")) {
        $(".background").addClass("background-hover");
    }
    $(this).css("opacity", "1.0");
    $(".side-hoverbar").css("visibility", "visible");
}

function mouseLeaveHoverBar() {
    if(!$("#sideBar").hasClass("sidenav-expand")) { // side bar opened
        $(".background").removeClass("background-hover");
    }
    $(this).css("opacity", "0.0");
    $(".side-hoverbar").css("visibility", "hidden");
}

function openSidebar() {
    if(!$("#sideBar").hasClass("sidenav-expand")) {
        $(".background").addClass("background-hover");
        $("#sideBar").addClass("sidenav-expand");
        mainWin.setResizable(true);
        $(".side-hoverbar-transparent").mouseleave();
    }
}

function closeSidebar() {
    $(".background").removeClass("background-hover");
    $("#sideBar").removeClass("sidenav-expand");
    mainWin.setResizable(false);
}

function onSideBarSetting(e) {
    e.stopPropagation();
    closeSidebar();
    showSettingPanel();
}

function showSettingPanel() {
    $(".popup-mask").fadeIn(100);
    $(".setting-panel").fadeIn(100);
    mainWin.setResizable(true);
}

function quit() {
    if(confirm("确定要退出吗？")) {
        mainWin.close();
    }
}


function onFileListReady(list) {
    globalFileList = list;
    globalFileListMap.clear();
    for(let i = 0; i < globalFileList.length; i++) {
        globalFileListMap.set(globalFileList[i].path, i);
    }
    refreshFiles();
}

function refreshFiles() {
    for (let i = 0; i < globalFileList.length; i++) {
        let elem = orgFileItemElem.clone();
        elem.attr("id", i);
        elem.children(".filename").text(globalFileList[i].name);
        elem.dblclick(runFileItem);

        $(".container").append(elem);
    }
}

function runFileItem() {
    let id = $(this).attr("id");
    if(id >= 0 && id < globalFileList.length) {
        shell.openItem(globalFileList[ $(this).attr("id") ].path);
    }
}

function onFileIconReady(iconInfo) {
    if(globalFileListMap.has(iconInfo.path)) {
        let id = globalFileListMap.get(iconInfo.path);
        //let url = "file:///" + iconInfo.icon;
        //url = url.replace(/\\/g,"\/");
        //url = encodeURI(url);
        //globalFileList[id].icon = url;
        //$("#" + id).children(".fileicon").css("background-image", "url(" + url + ")");
        $("#" + id).children(".fileicon").css("background-image", "url(" + iconInfo.icon + ")");
    }
    else {
        console.log("Error, file:" + iconInfo.path + " not belong to desktop");
    }
}
