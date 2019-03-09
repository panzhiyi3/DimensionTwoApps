window.$ = window.jQuery = require("./jquery.min");
const mainWin = require("electron").remote.getCurrentWindow();
const { ipcRenderer, shell } = require("electron");
const ElectronStore = require("electron-store");
let storePath = process.env.APPDATA + "\\DimensionTwoApps\\FoldDesktop";
const electronStore = new ElectronStore({cwd: storePath});

module.exports = {
    init: init,
    show: show,
    hide: hide,

    isShowMyComputer: isShowMyComputer,
    isShowRecycleBin: isShowRecycleBin
}

let showMyComputer = true;
let showRecycleBin = true;

function init() {
    if(electronStore.get("ShowMyComputer") != null) {
        showMyComputer = electronStore.get("ShowMyComputer");
    }
    if(electronStore.get("ShowRecycleBin") != null) {
        showRecycleBin = electronStore.get("ShowRecycleBin");
    }

    $("#ShowMyComputer").prop("checked", showMyComputer);
    $("#ShowRecycleBin").prop("checked", showRecycleBin);

    $(".setting-closebutton").click(hide);
    $("input[type=checkbox]").change(onCheckboxChanged);
    $("#resetWindowBounds").click(resetBounds);
}

function show() {
    $(".popup-mask").fadeIn(100);
    $(".setting-panel").fadeIn(100);
    mainWin.setResizable(true);
}

function hide() {
    $(".popup-mask").fadeOut(100);
    $(".setting-panel").fadeOut(100);
    mainWin.setResizable(false);
}

function isShowMyComputer() {
    return showMyComputer;
}

function isShowRecycleBin() {
    return showRecycleBin;
}

function onCheckboxChanged() {
    let id = $(this).attr("id");
    let checked = $(this).prop("checked");

    electronStore.set(id, checked);

    if(id == "ShowMyComputer") {
        showMyComputer = checked;
        ipcRenderer.send("RefreshFiles");
    }
    else if(id == "ShowRecycleBin") {
        showRecycleBin = checked;
        ipcRenderer.send("RefreshFiles");
    }
}

function resetBounds() {
    electronStore.delete("bounds");
    ipcRenderer.send("ResetWindowBounds");
}