var os = require("os")
var jq = require("./jquery.min.js")

var textTime = document.getElementById('time');
var textWeekDay = document.getElementById('week');
var textMonth = document.getElementById('month');
var textMonthDay = document.getElementById('monthday');

var clockHours = document.getElementById('clock_hours');
var clockMinutes = document.getElementById('clock_minutes');

window.onload = function() {
    function addzero(num) {
        if(num >= 10)
        {
            return "" + num;
        }
        else
        {
            return "0" + num;
        }
    }
    
    function updateTime() {
        var date = new Date();
        var str = addzero(date.getHours()) + ":" + addzero(date.getMinutes());
        textTime.innerHTML = str;

        clockHours.style.transform = "rotate(" + (date.getHours() * 30 - 90) + "deg)";
        clockMinutes.style.transform = "rotate(" + (date.getMinutes() * 6 - 90) + "deg)";
    }

    setInterval(updateTime, 10000);
    updateTime();
}

// function Adate(){
//     var date = new Date();
//     var aDate = document.getElementById("aDate");
//     var week = document.getElementById('week');
//     var weekList = ["星期天","星期一","星期二","星期三","星期四","星期五","星期六"];
//     var str = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate();
//     aDate.innerHTML = str;
//     var westr = weekList[date.getDay()];
//     week.innerHTML = westr;
// }
// Adate();