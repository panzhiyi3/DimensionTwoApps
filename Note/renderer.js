window.$ = window.jQuery = require("./jquery.min");

let nextNoteId = 0;
let arrayNotes = [];

let orgItem = $(".item").clone();
$(".item").detach();

init();

function init() {
    if(localStorage.getItem("arrayNotes")) {
        arrayNotes = JSON.parse("[" + localStorage.getItem("arrayNotes") + "]");

        for(let i = 0; i < arrayNotes.length; i++) {
            if(arrayNotes[i] > nextNoteId) {
                nextNoteId = arrayNotes[i] + 1;
            }

            addNote(arrayNotes[i]);
            setNoteContent(arrayNotes[i], localStorage.getItem("" + arrayNotes[i]));
        }
    }
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
        if(confirm("确认删除此记录？")) {
            delNote(parseInt( $(this).parent().attr("id") ));
        }
    });

    item.children(".content-full").click(function (e) {
        e.stopPropagation();
    });

    item.children(".content-full").blur(function() {
        localStorage.setItem("" + $(this).parent().attr("id"), $(this).val());
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
        localStorage.setItem("arrayNotes", arrayNotes.toString());
    }

    localStorage.removeItem("" + id);
    $("#" + id).detach();
}

$(".add-button").click(function (e) {
    let thisId = nextNoteId;
    nextNoteId++;

    arrayNotes.push(thisId);

    localStorage.setItem("arrayNotes", arrayNotes.toString());
    localStorage.setItem("" + thisId, "");

    addNote(thisId);
});
