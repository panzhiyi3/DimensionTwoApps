var textTime = document.getElementById('time');
var textWeekDay = document.getElementById('week');
var textMonth = document.getElementById('month');
var textMonthDay = document.getElementById('monthday');

var lastWeekVal = -1;
var lastMonthVal = -1;
var lastMonthDayVal = -1;

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

        if(date.getDay() != lastWeekVal) {
            var weekList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            lastWeekVal = date.getDay();
            textWeekDay.innerHTML = weekList[lastWeekVal];
        }

        if(date.getMonth() != lastMonthVal) {
            var monthList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            lastMonthVal = date.getMonth();
            textMonth.innerHTML = monthList[lastMonthVal];
        }

        if(date.getDate() != lastMonthDayVal) {
            var tmp = ["1st", "2nd", "3rd"];
            lastMonthDayVal = date.getDate();
            if(lastMonthDayVal <= 3)
                textMonthDay.innerHTML = tmp[lastMonthDayVal - 1];
            else {
                textMonthDay.innerHTML = lastMonthDayVal + "th";
            }
        }

        clockHours.style.transform = "rotate(" + (date.getHours() * 30 - 90) + "deg)";
        clockMinutes.style.transform = "rotate(" + (date.getMinutes() * 6 - 90) + "deg)";
    }

    setInterval(updateTime, 10000);
    updateTime();
}
