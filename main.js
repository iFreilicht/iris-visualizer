//import {Color} from "./Color/Color.js"
"use strict";

//constants
var pollingInterval = 16;
var numLeds 		= 12;
var ledsStepRad 	= 2/numLeds;
var ledsWidthRad 	= 0.156;
var ledLastStartRad = 1.5 - ledsWidthRad/2;
var ledLastEndRad 	= 1.5 + ledsWidthRad/2;
var caseColorOuter	= new Color('hsl(0,0%,15%)');
var caseColorEdge	= new Color('hsl(0,0%,10%)');
var caseColorInner	= new Color('hsl(0,0%,5%)');
var buttonColor		= new Color('hsl(0,0%,10%)');

//define Cue constructor
function Cue(){
	this.channels = [
		false, false, false, false, 
		false, false, false, false, 
		false, false, false, false
	];
	this.reverse = false;
	this.wrap_hue = false;
	this.start_color = new Color('black');
	this.end_color = new Color('black');
	this.offset_color = new Color('black');
	this.time_divisor = numLeds;
	this.delay = new Date(0);
	this.duration = new Date(1000);
	this.ramp_type = 'jump';
	this.ramp_parameter = 0.5
};

//define CueListItem constructor
function CueListItem(cue_index, start_stop){
	this.cue_index = cue_index;
	this.start_stop = start_stop;
	this.wait_time = new Date(0);
}

//get document elements
var ledRingCanvas = document.getElementById("ledRingCanvas");
var rampParameterDisplay = document.getElementById("rampParameterDisplay");
var output = document.getElementById("output");
var ctx = ledRingCanvas.getContext("2d");

//measurements in mm
var buttonR			= 4.9;
var ringR			= 5.45;
var ringWidth		= 0.9;
var caseRInner		= 6;
var caseREdge		= 6.75;
var caseROuter		= 9;

//above Radii are in mm, have to be scaled to pixels
var canvasScale = 20;

var ringX = ledRingCanvas.width/2;
var ringY = ledRingCanvas.height/2;

//set up canvas drawing context
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

//draw static parts to canvas
function drawCasePart(radius, color){
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(ringX, ringY, radius * canvasScale, 0, 2 * Math.PI);
	ctx.fill();
}
drawCasePart(caseROuter, caseColorOuter);
drawCasePart(caseREdge, caseColorEdge);
drawCasePart(caseRInner, caseColorInner);
drawCasePart(buttonR, buttonColor);

//Event Handlers:
function updateStartColor(jscolor){
	cue1.start_color = new Color("#" + jscolor);
}
function updateEndColor(jscolor){	
	var color = new Color("#" + jscolor);
	//constrain hue to make picking a perfect rainbow easier
	if(color.hue() == 0){
		color.hue(359);
	}
	cue1.end_color = color;
}

function updateRampParameter(value){
	cue1.ramp_parameter = value;
	rampParameterDisplay.innerHTML = value;
}

function updateRampType(value){
	cue1.ramp_type = value;
}

function updateDuration(value){
	cue1.duration = new Date(parseInt(value));
	resetTimes();
}

function updateTimeDivisor(value){
	cue1.time_divisor = parseInt(value);
	resetTimes();
}

function updateReverse(checked){
	cue1.reverse = checked;
	resetTimes();
}

//Draw colour to one LED
function drawLed(index, color){
	index = index % numLeds;
	ctx.lineWidth = ringWidth * canvasScale;
	ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.arc(ringX, ringY, ringR * canvasScale, 
		(ledLastStartRad + ledsStepRad * index) * Math.PI, 
		(ledLastEndRad + ledsStepRad * index) * Math.PI
	);
	ctx.stroke();
};

//interpolate between two colours by applying ramp_type
function interpolate(start_color, end_color, factor, ramp_type, ramp_parameter){
	ramp_parameter = typeof ramp_parameter !== 'undefined' ? ramp_parameter : 0.5;
	
	//working variables for HSL
	var startHSL = {
		hue 		: start_color.hue(),
		saturation 	: start_color.saturation(),
		lightness 	: start_color.lightness()
	};
	
	var endHSL = {
		hue 		: end_color.hue(),
		saturation 	: end_color.saturation(),
		lightness 	: end_color.lightness()
	};
	
	var resultHSL = {
		hue 		: undefined,
		saturation 	: undefined,
		lightness 	: undefined
	};
	
	
	switch(ramp_type){
	case "jump":
		if (factor + 0.02 > ramp_parameter){
			return new Color(end_color);
		} else {
			return new Color(start_color);
		}
		break;
	case "linearHSL":
		for(let i in resultHSL){
			if (factor < ramp_parameter){
				resultHSL[i] = Math.round( 
					+(startHSL[i]) + (endHSL[i] - startHSL[i]) * factor/ramp_parameter 
				);
			} else {
				resultHSL[i] = Math.round(
					+(endHSL[i]) + (startHSL[i] - endHSL[i]) * (factor - ramp_parameter)/(1-ramp_parameter) 
				);
			}
		}	
		return new Color(resultHSL);
	case "linearRGB":
		var resultColor = new Color(start_color);
		resultColor.interpolate(end_color, factor);
		return resultColor;
	}
}

//Set up cues
var cue1 = new Cue();
cue1.duration = new Date(3000);
cue1.ramp_type = "linearHSL";
cue1.ramp_parameter = 1;
cue1.time_divisor = numLeds;
//cue1.start_color = new Color('hsl(359, 100%, 50%)');
//cue1.end_color = new Color('hsl(0, 100%, 50%)');
cue1.start_color = new Color('#FF0000');
cue1.end_color = new Color('#FF0001');

//draw first ring
var currentColor = new Color('grey');

for(let i = 1; i <= numLeds; i++){
	if(i === numLeds){
		drawLed(i, new Color('green'));
	} else {
		drawLed(i, currentColor);
	}
}

//bootstrap times
var currentTimes = [];
function resetTimes(){
	currentTimes = [];
	for(let i = 0; i < numLeds; i++){
		currentTimes.push((cue1.duration/cue1.time_divisor) * i);
	}
	
	//this might look wrong, but to make the animation spin clockwise (which is
	//considered to be the non-reversed direction) the time array has to be reversed.
	//also, the first LED should stay in position 0 because it is where the animation is starting
	if(!cue1.reverse){
		currentTimes = currentTimes.splice(0,1).concat(currentTimes.reverse());
	}
}
resetTimes();

//*
//Main loop
window.setInterval(function () {
	var currentColors = [];
	var duration = cue1.duration
	for(let i = 0; i < numLeds; i++){
		currentColors.push(new Color(cue1.start_color));
		currentColors[i] = interpolate(
			cue1.start_color,
			cue1.end_color,
			currentTimes[i]/duration,
			cue1.ramp_type,
			cue1.ramp_parameter);
		drawLed(i, currentColors[i]);
	}
	
	//update times
	for(let i in currentTimes){
		currentTimes[i] = (currentTimes[i] + pollingInterval) % duration;
	}
}, pollingInterval);
//*/
