window.$ = window.jQuery = require("./jquery.min");
const mainWin = require("electron").remote.getCurrentWindow();

$(".setting-closebutton").click(hideSettingPanel);

function hideSettingPanel() {
    $(".popup-mask").fadeOut(100);
    $(".setting-panel").fadeOut(100);
    mainWin.setResizable(false);
}