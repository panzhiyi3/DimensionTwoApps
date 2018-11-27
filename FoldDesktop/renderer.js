window.$ = window.jQuery = require("./jquery.min");
const mainWin = require("electron").remote.getCurrentWindow();
const { ipcRenderer, shell } = require("electron");
const Path = require("path");
const SettingPanel = require("./settingPanel");

let globalFileList = [];
let globalFileListMap = new Map();
let orgFileItemElem = $(".item").clone();

let isFold = false;
let isShowHiddenFiles = true;
let isShowFileExtName = true;
let timerIdRefresh = 0;

let SORT_TYPE = {
    Name: 0,
    Size: 1,
    Type: 2,
    ModTime: 3,
};

let sortType = SORT_TYPE.Name;

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

    SettingPanel.init();
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
    SettingPanel.show();
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
    addSystemIcons();
    sortFileList();
    for(let i = 0; i < globalFileList.length; i++) {
        globalFileListMap.set(globalFileList[i].path, i);
    }
    refreshFileElements();
}

function refreshFileElements() {
    for (let i = 0; i < globalFileList.length; i++) {
        addFileElement(i);
    }
}

function addSystemIcons() {
    if(SettingPanel.isShowMyComputer()) {
        file = {
            path: "::{20D04FE0-3AEA-1069-A2D8-08002B30309D}",
            name: "::{20D04FE0-3AEA-1069-A2D8-08002B30309D}",
            isDir: false,
            isHidden: false,
            icon: null
        };
        globalFileList.push(file);

        ipcRenderer.send("GetFileIcon", JSON.stringify({"path": file.path}));
    }
    if(SettingPanel.isShowRecycleBin()) {
        file = {
            path: "::{645FF040-5081-101B-9F08-00AA002F954E}",
            name: "::{645FF040-5081-101B-9F08-00AA002F954E}",
            isDir: false,
            isHidden: false,
            icon: null
        };
        globalFileList.push(file);

        ipcRenderer.send("GetFileIcon", JSON.stringify({"path": file.path}));
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

function prefixInteger(num, length) {
    return (Array(length).join('0') + num).slice(-length);
}

function dateToDisplayString(date) {
    let text = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " ";
    text += prefixInteger(date.getHours(), 2) + ":" + prefixInteger(date.getMinutes(), 2);
    return text;
}

function sizeToDisplayText(size) {
    let text = "";
    let s = size / 1024 / 1024 / 1024;
    if(s > 1) {
        if(s >= 100) {
            return s.toFixed(0) + " GB";
        }
        else {
            return s.toFixed(2) + " GB";
        }
    }
    s = size / 1024 / 1024;
    if(s > 1) {
        if(s >= 100) {
            return s.toFixed(0) + " MB";
        }
        else {
            return s.toFixed(2) + " MB";
        }
    }
    s = size / 1024;
    if(s > 1) {
        if(s >= 100) {
            return s.toFixed(0) + " KB";
        }
        else {
            return s.toFixed(2) + " KB";
        }
    }

    s = size;
    return s.toFixed(2) + " 字节";
}

function getTooltipText(f) {
    let tooltip = f.name;
    if(!f.isDir) {
        let ext = Path.extname(f.name);
        if(ext.search(".") == 0) {
            ext = ext.slice(1);
        }
        tooltip += "\r\n项目类型：" + ext + " 文件";
    }
    if(f.mtime) {
        let date = new Date(f.mtime);
        tooltip += "\r\n修改日期：" + dateToDisplayString(date);
    }
    else if(f.birthtime) {
        let date = newDate(f.birthtime);
        tooltip += "\r\n创建日期：" + dateToDisplayString(date);
    }
    if(f.size) {
        tooltip += "\r\n大小：" + sizeToDisplayText(f.size);
    }
    return tooltip;
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

    if(f.name.search("::") == 0) { // Special system icons, e.g.Computer("::{20D04FE0-3AEA-1069-A2D8-08002B30309D}")
        if(f.name == "::{20D04FE0-3AEA-1069-A2D8-08002B30309D}") {
            elem.children(".filename").text("计算机");
        }
        else if(f.name == "::{645FF040-5081-101B-9F08-00AA002F954E}") {
            elem.children(".filename").text("回收站");
        }
    }
    else {    
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
    
        elem.attr("title", getTooltipText(f));
    }

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

function sortFileList() {
    switch(sortType) {
        case SORT_TYPE.Name:
            globalFileList.sort(compareName);
            break;
        case SORT_TYPE.Size:
            globalFileList.sort(compareSize);
            break;
        case SORT_TYPE.Type:
            globalFileList.sort(compareType);
            break;
        case SORT_TYPE.ModTime:
            //globalFileList.sort(compareModTime);
            break;
    }
}

function compareCommon(a, b) {
    let isASpecialFile = a.name.search("::") == 0;
    let isBSpecialFile = b.name.search("::") == 0;

    if(isASpecialFile) {
        if(!isBSpecialFile) {
            return -1;
        }
    }
    else if(isBSpecialFile) {
        if(!isASpecialFile) {
            return 1;
        }
    }

    if(a.isDir) {
        if(!b.isDir) {
            return -1;
        }
    }
    else if(b.isDir) {
        if(!a.isDir) {
            return 1;
        }
    }
    return 0;
}

function compareName(a, b) {
    if(a.name == null || b.name == null) {
        return 0;
    }
    let ret = compareCommon(a, b);
    if(ret != 0) {
        return ret;
    }
    return a.name.localeCompare(b.name);
}

function compareSize(a, b) {
    if(a.name == null || b.name == null) {
        return 0;
    }
    if(a.size == null || b.size == null) {
        return 0;
    }
    let ret = compareCommon(a, b);
    if(ret != 0) {
        return ret;
    }

    if(a.size < b.size) {
        return -1;
    } else if(a.size > b.size) {
        return 1;
    }
    else {
        return a.name.localeCompare(b.name);
    }
}

function compareType(a, b) {
    if(a.name == null || b.name == null) {
        return 0;
    }

    let aExt = Path.extname(a.name);
    let bExt = Path.extname(a.name);

    let ret = compareCommon(a, b);
    if(ret != 0) {
        return ret;
    }

    ret = aExt.localeCompare(bExt);
    if(ret != 0) {
        return ret;
    }
    return a.name.localeCompare(b.name);
}

function compareModTime(a, b) {
}