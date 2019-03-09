window.$ = window.jQuery = require("./jquery.min");
const ElectronStore = require("electron-store");
let storePath = process.env.APPDATA + "\\DimensionTwoApps\\FoldDesktop";
const electronStore = new ElectronStore({cwd: storePath});

module.exports = {
    init: init,
}

function init() {
    if(electronStore.get("UserGuideShowed") == null) {
        show();
        electronStore.set("UserGuideShowed", 1);
    }

    $("#guideCloseBtn").click(hide);
}

function show() {
    $(".popup-mask").fadeIn(100);
    $(".user-guide").fadeIn(100);
}

function hide() {
    $(".popup-mask").fadeOut(100);
    $(".user-guide").fadeOut(100);
}
