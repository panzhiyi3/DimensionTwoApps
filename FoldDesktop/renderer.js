window.$ = window.jQuery = require("./jquery.min");
const mainWin = require("electron").remote.getCurrentWindow();
const { ipcRenderer, shell } = require("electron");

let globalFileList = [];
let globalFileListMap = new Map();
let orgFileItemElem = $(".item").clone();

let isFold = false;

init();

ipcRenderer.on('log', (event, log) => {
    console.log(log);
});

ipcRenderer.on('FileListReady', (event, fileList) => {
    onFileListReady(fileList);
});

ipcRenderer.on('FileIconReady', (event, iconInfo) => {
    onFileIconReady(iconInfo);
});

ipcRenderer.on('FileAdd', (event, file) => {
    onFileAdd(file);
});

ipcRenderer.on('FileModified', (event, str) => {
    onFileModified(str);
});

ipcRenderer.on('FileDel', (event, filePath) => {
    onFileDel(filePath);
});

ipcRenderer.on('DirectoryAdd', (event, file) => {
    onFileAdd(file);
});

ipcRenderer.on('DirectoryDel', (event, filePath) => {
    onFileDel(filePath);
});

function init() {
    $(".item").remove();

    // $(".background").mouseover(function (e) {
    //     console.log("xixi");
    //     mainWin.setIgnoreMouseEvents(true, { forward: true });
    // }).mouseout(function (e) {
    //     console.log("haha");
    //     mainWin.setIgnoreMouseEvents(false);
    // });
    // window.addEventListener('mousemove', function (e) {
    //     if(e.target) {
    //         if(e.target.className == "background" || e.target.className == "container") {
    //             mainWin.setIgnoreMouseEvents(true, { forward: true });
    //             console.log("xixi");
    //         }
    //     }
    //     else {
    //         mainWin.setIgnoreMouseEvents(false);
    //         console.log("haha");
    //     }
    // });

    window.onresize = function () {
        $(".background").height(document.documentElement.clientHeight - 11);
    }

    $(".background").height(document.documentElement.clientHeight - 11);

    $(".side-hoverbar-transparent").mouseenter(mouseEnterHoverBar)

    $(".side-hoverbar-transparent").mouseleave(mouseLeaveHoverBar);

    $(".sidebar-button").click(openSidebar);

    $(".foldbutton").click(foldOrExpand);

    $("#sidebar-closebutton").click(closeSidebar);

    $("#sidebar-settingbutton").click(onSideBarSetting);

    $("#sidebar-quitbutton").click(quit);
}

function mouseEnterHoverBar() {
    if(!$(".background").hasClass("background-hover")) {
        if(!isFold) {
            $(".background").addClass("background-hover");
        }
    }
    //$(this).css("opacity", "1.0");
    $(".side-hoverbar").css("visibility", "visible");
}

function mouseLeaveHoverBar() {
    if(!$("#sideBar").hasClass("sidenav-expand")) { // side bar opened, don't show hover state
        $(".background").removeClass("background-hover");
    }
    //$(this).css("opacity", "0.0");
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

function foldOrExpand() {
    if(isFold) {
        isFold = false;
        $(".container").fadeIn(50);
        if($(".foldbutton").hasClass("fa-caret-right")) {
            $(".foldbutton").removeClass("fa-caret-right")
            .addClass("fa-caret-left")
            .attr("title", "折叠");
        }
    }
    else {
        isFold = true;
        $(".container").fadeOut(50);
        $(".background").removeClass("background-hover");
        if($(".foldbutton").hasClass("fa-caret-left")) {
            $(".foldbutton").removeClass("fa-caret-left")
            .addClass("fa-caret-right")
            .attr("title", "展开");
        }
    }
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
        addFileElement(i);
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
        $("#" + id).children(".fileicon").children(".img-fileicon").attr("src", iconInfo.icon);
    }
    else {
        console.log("Error, file:" + iconInfo.path + " not belong to desktop");
    }
}

function onFileAdd(str) {
    try {
        let file = eval('(' + str + ')'); //Use eval instead of JSON.parse, bypass path backslash escape character problem
        globalFileList.push(file);
        globalFileListMap.set(file.path, globalFileList.length - 1);

        addFileElement(globalFileList.length - 1);

        ipcRenderer.send("GetFileIcon", JSON.stringify({"path": file.path}));
    }
    catch(err) {
        console.log(err);
    }
}

function addFileElement(id) {
    let elem = orgFileItemElem.clone();
    elem.attr("id", id);
    elem.children(".filename").text(globalFileList[id].name);
    elem.children(".filename").attr("title", globalFileList[id].name);
    elem.dblclick(runFileItem);
    $(".container").append(elem);
}

function onFileModified(str) {
    try {
        let file = eval('(' + str + ')');
        if(globalFileListMap.get(file.path)) {
            let id = globalFileListMap.get(file.path);
            globalFileList[id] = file;

            ipcRenderer.send("GetFileIcon", JSON.stringify({"path": file.path}));
        }
    }
    catch(err) {
        console.log(err);
    }
}

function onFileDel(filePath) {
    try {
        if(globalFileListMap.get(filePath)) {
            let id = globalFileListMap.get(filePath);
            globalFileList[id] = new Object(); // Don't delete now, or we have to rearrange all file id
            globalFileListMap.delete(filePath);
            $("#" + id).remove();
        }
    }
    catch(err) {
        console.log(err);
    }
}