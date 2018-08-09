// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var os = require("os")
var d3 = require("./d3.js")

var startMeasure = cpuAverage()

var pper = 0;
var pperInteral;
var cpuUsage = document.getElementById('cpuUsage');

//drawCanvanPercent('cpuCanvas', 'rem', 2, '#0e9cfa', 0.2, '#fff');

//Set delay for second Measure
setTimeout(doCalc, 1000)

var width = 300,
    height = 300,
    twoPi = 2 * Math.PI,
    progress = 0,
    total = 100, // must be hard-coded if server doesn't report Content-Length
    formatPercent = d3.format(".0%");

var arc = d3.arc()
    .startAngle(0)
    .innerRadius(100)
    .outerRadius(140);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var meter = svg.append("g")
    .attr("class", "progress-meter");

meter.append("path")
    .attr("class", "background")
    .attr("d", arc.endAngle(twoPi));

var foreground = meter.append("path")
    .attr("class", "foreground");

var text = meter.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", ".35em");

var i = d3.interpolate(progress, 0 / total);
d3.transition().tween("progress", function () {
    return function (t) {
        progress = i(t);
        foreground.attr("d", arc.endAngle(twoPi * progress));
        text.text(formatPercent(progress));
    };
});

//meter.transition().delay(250).attr("transform", "scale(1)");

function doCalc() {
    //Grab second Measure
    var endMeasure = cpuAverage();

    //Calculate the difference in idle and total time between the measures
    var idleDifference = endMeasure.idle - startMeasure.idle
    var totalDifference = endMeasure.total - startMeasure.total

    //Calculate the average percentage CPU usage
    var percentageCPU = 100 - ~~(100 * idleDifference / totalDifference) //parseInt

    //Output result to console
    console.log(percentageCPU + "% CPU Usage.")

    //var cpuusage = document.getElementById("cpu")
    //cpuusage.innerHTML = percentageCPU + "% CPU Usage."

    var i = d3.interpolate(progress, percentageCPU / 100);
    d3.transition().tween("progress", function () {
        return function (t) {
            progress = i(t);
            foreground.attr("d", arc.endAngle(twoPi * progress));
            text.text(formatPercent(progress));
        };
    });

    startMeasure = endMeasure

    setTimeout(doCalc, 1000)
}

function cpuAverage() {
    //Initialise sum of idle and time of cores and fetch CPU info
    var totalIdle = 0, totalTick = 0
    var cpus = os.cpus()

    //Loop through CPU cores
    for (var i = 0, len = cpus.length; i < len; i++) {
        //Select CPU core
        var cpu = cpus[i]

        //Total up the time in the cores tick
        for (type in cpu.times) {
            totalTick += cpu.times[type]
        }

        //Total up the idle time of the core
        totalIdle += cpu.times.idle
    }

    //Return the average Idle and Tick times
    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length }
}

function drawCanvanPercent(ele_id, dw, cir_r, cir_color, line_w, fill_color) {
    if (dw == "rem") {
        cir_r = cir_r * (window.screen.width / 10);
        line_w = line_w * (window.screen.width / 10);
    }
    var canvas = document.getElementById(ele_id);
    var circle =
    {
        r: cir_r / 2,      //圆的半径
        per: canvas.getAttribute('data-percent'),      //百分比分子
        color: cir_color,      //圆的颜色
        lineWidth: line_w      //圆的颜色
    };
    canvas.width = canvas.height = circle.r * 2;
    canvas.style.borderRadius = "50%";
    if (canvas.getContext) {
        var ctx2 = canvas.getContext("2d");
        ctx2.fillStyle = fill_color;
        ctx2.arc(circle.r, circle.r, circle.r - circle.lineWidth / 2, 0, Math.PI * 2, false);
        ctx2.fill();
        var ctx = canvas.getContext("2d");
        pperInteral = setInterval(function () {
            drawMove(ctx, circle);
        }, 10);
    }
}

function drawMove(ctx, circle) {
    if (pper >= circle.per) {
        pper = circle.per;
        clearTimeout(pperInteral);
    }
    else {
        pper++;
    }
    dushu.innerText = pper + '%';
    ctx.beginPath();
    ctx.strokeStyle = circle.color;
    ctx.lineWidth = circle.lineWidth;
    ctx.arc(circle.r, circle.r, circle.r, 0, Math.PI * (pper / 100) * 360 / 180, false);
    ctx.stroke();
}
