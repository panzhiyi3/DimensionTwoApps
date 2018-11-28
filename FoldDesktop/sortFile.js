window.$ = window.jQuery = require("./jquery.min");
const { ipcRenderer } = require("electron");
const Path = require("path");
const ElectronStore = require("electron-store");
const electronStore = new ElectronStore();

let SORT_TYPE = {
    Name: 0,
    Size: 1,
    Type: 2,
    ModTime: 3,
};

let sortBy = SORT_TYPE.Name

module.exports = {
    init: init,
    sortByName: sortByName,
    sortBySize: sortBySize,
    sortByType: sortByType,
    sortByModTime: sortByModTime,
    sortFileList: sortFileList,

    sortBy: sortBy,
    SORT_TYPE: SORT_TYPE
}

function init() {
    $("#sortByName").click(sortByName);

    $("#sortBySize").click(sortBySize);

    $("#sortByType").click(sortByType);

    $("#sortByModTime").click(sortByModTime);

    if(electronStore.get("sortBy")) {
        sortBy = electronStore.get("sortBy");
    }

    switch(sortBy) {
        case SORT_TYPE.Name:
            $("#sortByName").children(".check").css("display", "inline-block");
            break;
        case SORT_TYPE.Size:
            $("#sortBySize").children(".check").css("display", "inline-block");
            break;
        case SORT_TYPE.Type:
            $("#sortByType").children(".check").css("display", "inline-block");
            break;
        case SORT_TYPE.ModTime:
            $("#sortByModTime").children(".check").css("display", "inline-block");
            break;
    }
}

function sortByName() {
    sortBy = SORT_TYPE.Name;
    electronStore.set("sortBy", sortBy);

    $(".dropdown-content>div").children(".check").css("display", "none");
    $("#sortByName").children(".check").css("display", "inline-block");
    sortFiles();
}

function sortBySize() {
    sortBy = SORT_TYPE.Size;
    electronStore.set("sortBy", sortBy);

    $(".dropdown-content>div").children(".check").css("display", "none");
    $("#sortBySize").children(".check").css("display", "inline-block");
    sortFiles();
}

function sortByType() {
    sortBy = SORT_TYPE.Type;
    electronStore.set("sortBy", sortBy);

    $(".dropdown-content>div").children(".check").css("display", "none");
    $("#sortByType").children(".check").css("display", "inline-block");
    sortFiles();
}

function sortByModTime() {
    sortBy = SORT_TYPE.ModTime;
    electronStore.set("sortBy", sortBy);

    $(".dropdown-content>div").children(".check").css("display", "none");
    $("#sortByModTime").children(".check").css("display", "inline-block");
    sortFiles();
}

function sortFiles() {
    ipcRenderer.send("RefreshFiles");
}

function sortFileList(fileList) {
    switch(sortBy) {
        case SORT_TYPE.Name:
            fileList.sort(compareName);
            break;
        case SORT_TYPE.Size:
            fileList.sort(compareSize);
            break;
        case SORT_TYPE.Type:
            fileList.sort(compareType);
            break;
        case SORT_TYPE.ModTime:
            fileList.sort(compareModTime);
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
        else {
            return a.name.localeCompare(b.name);
        }
    }
    else if(b.isDir) {
        if(!a.isDir) {
            return 1;
        }
        else {
            return b.name.localeCompare(a.name);
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
    let bExt = Path.extname(b.name);

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
    if(a.mtime == null || b.mtime == null) {
        return compareName(a, b);
    }

    let aDate = new Date(a.mtime);
    let bDate = new Date(b.mtime);

    let ret = compareCommon(a, b);
    if(ret != 0) {
        return ret;
    }

    if(aDate.getTime() < bDate.getTime()) {
        return -1;
    }
    else if(aDate.getTime() > bDate.getTime()) {
        return 1;
    }
    else {
        return compareName(a, b);
    }
}
