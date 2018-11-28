window.$ = window.jQuery = require("./jquery.min");
const mainWin = require("electron").remote.getCurrentWindow();
const { ipcRenderer, shell } = require("electron");
const Path = require("path");
const ElectronStore = require("electron-store");
const electronStore = new ElectronStore();
let i18n = require("i18n");
const SettingPanel = require("./settingPanel");
const SortFile = require("./sortFile");

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
    initI18N();

    $(".item").remove();

    window.onresize = function () {
        $(".background").height(document.documentElement.clientHeight - 11);
    }

    $(".background").height(document.documentElement.clientHeight - 11);

    $(".container").bind("mousewheel", onMouseWheel);

    $(".side-hoverbar-transparent").mouseenter(mouseEnterHoverBar)

    $(".side-hoverbar-transparent").mouseleave(mouseLeaveHoverBar);

    $(".sidebar-button").click(openSidebar);

    $(".foldbutton").click(foldOrExpand);

    $("#sidebar-closebutton").click(closeSidebar);

    $("#sidebar-settingbutton").click(onSideBarSetting);

    $("#sidebar-quitbutton").click(quit);

    $("#sidebar-sortbutton").click(function() {
        $(".dropdown-content").toggleClass("dropdown-content-show");
    });

    // Close the sort type button dropdown menu, if the user clicks outside of it
    window.onclick = function (e) {
        if (!e.target.matches("#sidebar-sortbutton")) {
            if($(".dropdown-content").hasClass("dropdown-content-show")) {
                $(".dropdown-content").removeClass("dropdown-content-show")
            }
        }
    }

    $(document).keydown((event) => {
        onKeyDown(event);
    });

    SortFile.init();

    SettingPanel.init();
}

function initI18N() {
    i18n.configure({
        locales: ["en", "zh"],
        defaultLocale: "en",
        fallbacks: {"zh-CN": "zh", "zh-TW": "zh", "zh-HK": "zh"},
        directory: __dirname + "/locales"
    });
    i18n.setLocale(navigator.language);

    $(".foldbutton").attr("title", i18n.__("Fold"));
    $(".sidebar-button").attr("title", i18n.__("Menu"));
    $("#sidebar-closebutton").attr("title", i18n.__("CloseMenu"));
    $("#sidebar-sortbutton").attr("title", i18n.__("SortBy"));
    $("#sortByName").children("a").text(i18n.__("SortName"));
    $("#sortBySize").children("a").text(i18n.__("SortSize"));
    $("#sortByType").children("a").text(i18n.__("SortType"));
    $("#sortByModTime").children("a").text(i18n.__("SortModTime"));
    $("#sidebar-settingbutton").attr("title", i18n.__("Setting"));
    $("#sidebar-quitbutton").attr("title", i18n.__("Exit"));
    $(".setting-caption").text(i18n.__("Setting"));
    $("#ShowMyComputer").parent().children("text").text(i18n.__("ShowMyComputer"));
    $("#ShowRecycleBin").parent().children("text").text(i18n.__("ShowRecycleBin"));
}

function onMouseWheel(e) {
    e.preventDefault();
    let step = 80;

    function scrollTo(element, to, duration) {
        if (duration <= 0)
            return;
        var difference = to - element.scrollLeft;
        var perTick = difference / duration * 10;

        setTimeout(function () {
            element.scrollLeft = element.scrollLeft + perTick;
            if (element.scrollLeft == to)
                return;
            scrollTo(element, to, duration - 10);
        }, 10);
    }

    if (e.originalEvent.wheelDelta < 0) {
        scrollTo(this, this.scrollLeft + step, 50);
    } else {
        scrollTo(this, this.scrollLeft - step, 50);
    }
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
        $("#sideBar").css("visibility", "visible");
        $("#sideBar").addClass("sidenav-expand");
        mainWin.setResizable(true);
        $(".side-hoverbar-transparent").mouseleave();
    }
}

function closeSidebar() {
    $(".background").removeClass("background-hover");
    $("#sideBar").css("visibility", "hidden");
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
            .attr("title", i18n.__("Fold"));
        }
        $(".sidebar-button").css("visibility", "visible");

        ipcRenderer.send("Expand");
    }
    else {
        isFold = true;
        $(".container").fadeOut(50);
        $(".background").removeClass("background-hover");
        if($(".foldbutton").hasClass("fa-caret-left")) {
            $(".foldbutton").removeClass("fa-caret-left")
            .addClass("fa-caret-right")
            .attr("title", i18n.__("Expand"));
        }
        $(".sidebar-button").css("visibility", "hidden");

        ipcRenderer.send("Fold");
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
    SortFile.sortFileList(globalFileList);
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
            size: 0,
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
            size: 0,
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

function onFileKeyUp(e) {
    if(e.keyCode == 46) { // delete
        let forceDelete = e.keyCode == 16 // shift;
        let id = $(this).attr("id");
        if(globalFileList[id]) {
            ipcRenderer.send("DeleteFile", JSON.stringify(
                {path: globalFileList[id].path, forceDelete:forceDelete}
            ));
        }
        else {
            console.log("Delete file erroe, file id( " + id + " ) not exist");
        }
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
    return s.toFixed(0) + " " + i18n.__("Bytes");
}

function getTooltipText(f) {
    let tooltip = f.name;
    if(!f.isDir) {
        let ext = Path.extname(f.name);
        if(ext.search(".") == 0) {
            ext = ext.slice(1);
        }
        tooltip += "\r\n" + i18n.__("FileType") + "：" + ext + " " + i18n.__("File");
    }
    if(f.mtime) {
        let date = new Date(f.mtime);
        tooltip += "\r\n" + i18n.__("ModTime") + "：" + dateToDisplayString(date);
    }
    else if(f.birthtime) {
        let date = newDate(f.birthtime);
        tooltip += "\r\n" + i18n.__("BirthTime") + "：" + dateToDisplayString(date);
    }
    if(f.size) {
        tooltip += "\r\n" + i18n.__("Size") + "：" + sizeToDisplayText(f.size);
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
            elem.children(".filename").text(i18n.__("Computer"));
        }
        else if(f.name == "::{645FF040-5081-101B-9F08-00AA002F954E}") {
            elem.children(".filename").text(i18n.__("RecycleBin"));
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
    elem.keyup(onFileKeyUp);
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
