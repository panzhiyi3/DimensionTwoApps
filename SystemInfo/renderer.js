var os = require("os")
var d3 = require("./d3.min.js")

var startMeasure = cpuAverage()

setTimeout(doCalc, 2000)

var width = window.innerWidth,
    height = window.innerHeight,
    radius = 50,
    innerRadius = 30,
    ringRadius = 54,
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

// CPU usage recorder
var cpuDate = [];
var recordMaxHistory = 20;
var recorderHeight = 50;
var recorderWidth = 200;

var recorderMargin = {top: 10, right: 0, bottom: 10, left: 40};

var cpuRecorder = d3.select("#cpuRecorder")

var recXScale = d3.scaleLinear().range([0, recorderWidth]).domain([0,recordMaxHistory]);

var recYScale = d3.scaleLinear().range([recorderHeight, 0]).domain([0,100]);

recXAxis = g => g
    .attr("class", "recorder-axis")
    .attr("transform", "translate(" + recorderMargin.left + "," + (recorderHeight + recorderMargin.top) + ")")
    .call(d3.axisBottom(recXScale).ticks(recordMaxHistory).tickSize(4).tickFormat("").scale(recXScale));

recYAxis = g => g
    .attr("class", "recorder-axis")
    .attr("transform", "translate(" + recorderMargin.left + "," + recorderMargin.top + ")")
    .call(d3.axisLeft().ticks(3).scale(recYScale).tickSize(4).tickFormat(function(d) {
        return d + "%";
      }));

var cpuLine = d3.line()
    .x(d => recXScale(d.x))
    .y(d => recYScale(d.y));

cpuRecorder.append("rect")
    .attr("x", recorderMargin.left)
    .attr("y", recorderMargin.top)
    .attr("width", recorderWidth)
    .attr("height", recorderHeight)
    .attr("fill", "url(#bkg)");

cpuRecorder.append("g")
    .attr("transform", "translate(0, 100)")
    .call(recXAxis)

cpuRecorder.append("g")
    .attr("transform", "translate(10, 100)")
    .call(recYAxis);

var cpuRecorderLine = cpuRecorder.append("path")
    .attr("d", cpuLine(cpuDate))
    .attr("class", "recorder-line")
    .attr("transform", "translate(" + recorderMargin.left + "," + recorderMargin.top + ")");


foreground.transition().tween("progress", function () {
    var i = d3.interpolate(progress, 0 / total);
    return function (t) {
        progress = i(t);
        foreground.attr("d", arc.endAngle(twoPi * progress));
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

    updateRecorder(percentageCPU);

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

function updateRecorder(newPercentage) {
    if(cpuDate.length > 20) {
        cpuDate.shift();
    }

    cpuDate.push({
        x: cpuDate.length,
        y: newPercentage 
    });

    for(let i = 0; i < cpuDate.length; i++) {
        cpuDate[i].x = i;
        cpuDataIndex = i + 1;
    }
    cpuRecorderLine.attr("d", cpuLine(cpuDate));
}
