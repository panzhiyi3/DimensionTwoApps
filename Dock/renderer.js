window.$ = window.jQuery = require("./jquery.min");
let win = require('electron').remote.getCurrentWindow();
let chokidar = require('chokidar');

$(".titlebar").children().css("opacity", "0.0");

init();

function init() {
    window.addEventListener('mousemove', function (e) {
        if (e.target === document.documentElement)
            win.setIgnoreMouseEvents(true, { forward: true });
        else
            win.setIgnoreMouseEvents(false);
    });

    window.onresize = function () {
        $(".container").height(document.documentElement.clientHeight - $(".titlebar").height() - 10);
    }

    $(".container").height(document.documentElement.clientHeight - $(".titlebar").height() - 10);

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