window.$ = window.jQuery = require("./jquery.min");
const mainWin = require("electron").remote.getCurrentWindow();
const { ipcRenderer, shell } = require("electron");
const Path = require("path");

let globalFileList = [];
let globalFileListMap = new Map();
let orgFileItemElem = $(".item").clone();

let isFold = false;
let isShowHiddenFiles = true;
let isShowFileExtName = true;
let timerIdRefresh = 0;

init();

ipcRenderer.on("log", (event, log) => {
    console.log(log);
});

ipcRenderer.on("RefreshFileShowMode", (event, json) => {
    refreshFileShowMode(json);
});

ipcRenderer.on("FileListReady", (event, fileList) => {
    onFileListReady(fileList);
});

ipcRenderer.on("FileIconReady", (event, iconInfo) => {
    onFileIconReady(iconInfo);
});

ipcRenderer.on("FileAdd", (event, file) => {
    onFileAdd(file);
});

ipcRenderer.on("FileModified", (event, str) => {
    onFileModified(str);
});

ipcRenderer.on("FileDel", (event, filePath) => {
    onFileDel(filePath);
});

ipcRenderer.on("DirectoryAdd", (event, file) => {
    onFileAdd(file);
});

ipcRenderer.on("DirectoryDel", (event, filePath) => {
    onFileDel(filePath);
});

function init() {
    $(".item").remove();

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

    $(document).keydown((event) => {
        onKeyDown(event);
    });
}

function mouseEnterHoverBar() {
    if(!$(".background").hasClass("background-hover")) {
        if(!isFold) {
            $(".background").addClass("background-hover");
        }
    }
    $(".side-hoverbar-interact").css("visibility", "hidden");
    $(".side-hoverbar").css("visibility", "visible");
}

function mouseLeaveHoverBar() {
    if(!$("#sideBar").hasClass("sidenav-expand")) { // side bar opened, don't show hover state
        $(".background").removeClass("background-hover");
    }
    $(".side-hoverbar-interact").css("visibility", "visible");
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

function onKeyDown(event) {
    if(event.keyCode == 116) {
        refreshPage();
    }
}

// I don't like too much IO operation, pack all operations into one
function refreshPage() {
    if(timerIdRefresh) {
        clearTimeout(timerIdRefresh);
    }
    timerIdRefresh = setTimeout(refreshPageDelay, 500);
}

function refreshPageDelay() {
    timerIdRefresh = 0;
    ipcRenderer.send("RefreshFiles");
}

function refreshFileShowMode(json) {
    try {
        let mode = JSON.parse(json);
        isShowHiddenFiles = mode.isShowHiddenFiles;
        isShowFileExtName = mode.isShowFileExtName;
    }
    catch(err) {
        console.log(err);
    }
}

function onFileListReady(list) {
    $(".container").empty();
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

function onFileMouseUp(e) {
    if(e.button == 2) {
        ipcRenderer.send("FileContextMenu", JSON.stringify(
            {"path":globalFileList[ $(this).attr("id") ].path}
        ));
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
    let f = globalFileList[id];

    if(f.isHidden) {
        if(!isShowHiddenFiles) {
            return;
        }
    }

    let elem = orgFileItemElem.clone();
    elem.attr("id", id);

    if(f.isDir) {
        elem.children(".filename").text(f.name);
    }
    else {
        if(isShowFileExtName) {
            elem.children(".filename").text(f.name);
        }
        else {
            try {
                let withoutExt = Path.basename(f.name, Path.extname(f.name));
                elem.children(".filename").text(withoutExt);
            }
            catch(err) {
                elem.children(".filename").text(f.name);
            }
        }
    }

    if(f.isHidden) {
        elem.children(".fileicon").css("opacity", "0.5");
    }

    let tooltip = f.name;
    if(!f.isDir) {
        tooltip += "\r\n项目类型：" + Path.extname(f.name) + " 文件";
    }
    if(f.mtime) {
        tooltip += "\r\n修改时间：" + f.mtime;
    }
    else if(f.birthtime) {
        tooltip += "\r\n创建时间：" + f.birthtime;
    }
    if(f.size) {
        tooltip += "\r\n大小：" + (f.size / 1024) + "KB";
    }
    elem.attr("title", tooltip);

    elem.dblclick(runFileItem);
    elem.mouseup(onFileMouseUp);
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