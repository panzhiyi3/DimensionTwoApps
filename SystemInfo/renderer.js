var os = require("os")
var d3 = require("./d3.min.js")

var startMeasure = cpuAverage()

setTimeout(doCalc, 1000)

var width = window.innerWidth,
    height = window.innerHeight,
    radius = 70,
    innerRadius = 50,
    ringRadius = 75,
    twoPi = 2 * Math.PI,
    progress = 0,
    progressRam = 0,
    total = 100,
    formatPercent = d3.format(".0%");

var arc = d3.arc()
    .startAngle(0)
    .innerRadius(innerRadius)
    .outerRadius(radius);

var arcRing = d3.arc()
    .startAngle(0)
    .innerRadius(ringRadius - 2)
    .outerRadius(ringRadius);

// CPU
var svg = d3.select("#cpuUsage")
    .attr("width", ringRadius * 2)
    .attr("height", ringRadius * 2)
    .append("g")
    .attr("transform", "translate(" + ringRadius + "," + ringRadius + ")");

var meter = svg.append("g")
    .attr("class", "progress-meter");

meter.append("path")
    .attr("class", "background")
    .attr("d", arc.endAngle(twoPi));

var foreground = meter.append("path")
    .attr("class", "foreground");

meter.append("path")
    .attr("class", "foreground-ring")
    .attr("d", arcRing.endAngle(twoPi));

var text = meter.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .text("CPU");

// RAM
var svgRam = d3.select("#ramUsage")
    .attr("width", ringRadius * 2)
    .attr("height", ringRadius * 2)
    .append("g")
    .attr("transform", "translate(" + ringRadius + "," + ringRadius + ")");

var meterRam = svgRam.append("g")
    .attr("class", "progress-meter");

meterRam.append("path")
    .attr("class", "background")
    .attr("d", arc.endAngle(twoPi));

var foregroundRam = meterRam.append("path")
    .attr("class", "foreground");

    meterRam.append("path")
    .attr("class", "foreground-ring")
    .attr("d", arcRing.endAngle(twoPi));

var textRam = meterRam.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .text("RAM");

foreground.transition().tween("progress", function () {
    var i = d3.interpolate(progress, 0 / total);
    return function (t) {
        progress = i(t);
        foreground.attr("d", arc.endAngle(twoPi * progress));
        //text.text(formatPercent(progress));
    };
});

foregroundRam.transition().tween("progressRam", function () {
    var i = d3.interpolate(progressRam, 0 / total);
    return function (t) {
        progressRam = i(t);
        foregroundRam.attr("d", arc.endAngle(twoPi * progressRam));
    };
});

function doCalc() {
    var endMeasure = cpuAverage();

    var idleDifference = endMeasure.idle - startMeasure.idle
    var totalDifference = endMeasure.total - startMeasure.total

    var percentageCPU = 100 - ~~(100 * idleDifference / totalDifference) //parseInt

    foreground.transition().tween("progress", function () {
        var i = d3.interpolate(progress, percentageCPU / 100);
        return function (t) {
            progress = i(t);
            foreground.attr("d", arc.endAngle(twoPi * progress));
            //text.text(formatPercent(progress));
        };
    });

    var mem = ~~(os.freemem() / os.totalmem() * 100);

    foregroundRam.transition().tween("progressRam", function () {
        var i = d3.interpolate(progressRam, mem / 100);
        return function (t) {
            progressRam = i(t);
            foregroundRam.attr("d", arc.endAngle(twoPi * progressRam));
        };
    });

    startMeasure = endMeasure

    setTimeout(doCalc, 1000)
}

function cpuAverage() {
    var totalIdle = 0, totalTick = 0
    var cpus = os.cpus()

    for (var i = 0, len = cpus.length; i < len; i++) {
        var cpu = cpus[i]

        for (type in cpu.times) {
            totalTick += cpu.times[type]
        }

        totalIdle += cpu.times.idle
    }

    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length }
}
