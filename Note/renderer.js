window.$ = window.jQuery = require("./jquery.min");
const ElectronStore = require("electron-store");
const electronStore = new ElectronStore();
let i18n = require("i18n");

let nextNoteId = 0;
let arrayNotes = [];

let orgItem = $(".item").clone();
$(".item").detach();

init();

function init() {
    initI18N();

    if(electronStore.get("arrayNotes")) {
        arrayNotes = JSON.parse("[" + electronStore.get("arrayNotes") + "]");

        for(let i = 0; i < arrayNotes.length; i++) {
            if(arrayNotes[i] >= nextNoteId) {
                nextNoteId = arrayNotes[i] + 1;
            }

            addNote(arrayNotes[i]);
            setNoteContent(arrayNotes[i], electronStore.get("" + arrayNotes[i]));
        }
    }
}

function initI18N() {
    i18n.configure({
        locales: ["en", "zh"],
        defaultLocale: "en",
        fallbacks: {"zh-CN": "zh", "zh-TW": "zh", "zh-HK": "zh"},
        directory: __dirname + "/locales"
    });
    i18n.setLocale(navigator.language);
}

function addNote(id) {
    let item = orgItem.clone();

    item.attr("id", id);

    $(".container").append(item);

    item.click(function () {
        let thisOne = $(this);
    
        if (thisOne.hasClass("item-expand")) {
            thisOne.removeClass("item-expand");
            thisOne.children(".delete-button").removeClass("delete-button-expand");
            thisOne.children(".content-short").show(0);
            thisOne.children(".content-full").hide(0);
            thisOne.children(".collapse-button").hide(0);
            return;
        }
        thisOne.addClass("item-expand");
        thisOne.children(".delete-button").addClass("delete-button-expand");
        thisOne.children(".content-short").hide(0);
        thisOne.children(".content-full").show(0);
        thisOne.children(".collapse-button").show(0);
    });
    
    item.hover(function() {
        $(this).children(".delete-button").css("visibility", "visible");
        $(this).children(".collapse-button").css("visibility", "visible");
    }, function() {
        $(this).children(".delete-button").css("visibility", "hidden");
        $(this).children(".collapse-button").css("visibility", "hidden");
    });

    item.children(".delete-button").click(function (e) {
        e.stopPropagation();
        if(confirm(i18n.__("DeleteConfirm"))) {
            delNote(parseInt( $(this).parent().attr("id") ));
        }
    });

    item.children(".content-full").click(function (e) {
        e.stopPropagation();
    });

    item.children(".content-full").blur(function() {
        electronStore.set("" + $(this).parent().attr("id"), $(this).val());
        $(this).parent().children(".content-short").text( $(this).val() );
    });
}

function setNoteContent(id, text) {
    let note = $("#" + id);
    if(note) {
        note.children(".content-short").text(text);
        note.children(".content-full").val(text);
    }
}

function delNote(id) {
    let idx = arrayNotes.indexOf(id);
    if(idx > -1) {
        arrayNotes.splice(idx, 1);
        electronStore.set("arrayNotes", arrayNotes.toString());
    }

    electronStore.delete("" + id);
    $("#" + id).detach();
}

$(".add-button").click(function (e) {
    let thisId = nextNoteId;
    nextNoteId++;

    arrayNotes.push(thisId);

    electronStore.set("arrayNotes", arrayNotes.toString());
    electronStore.set("" + thisId, "");

    addNote(thisId);
});
