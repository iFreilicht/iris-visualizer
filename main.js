//import {Color} from "./Color/Color.js"
"use strict";

//constants
let pollingInterval = 16;
let numLeds 		= 12;
let ledsStepRad 	= 2/numLeds;
let ledsWidthRad 	= 0.156;
let ledLastStartRad = 1.5 - ledsWidthRad/2;
let ledLastEndRad 	= 1.5 + ledsWidthRad/2;
let caseColorOuter	= new Color('hsl(0,0%,15%)');
let caseColorEdge	= new Color('hsl(0,0%,10%)');
let caseColorInner	= new Color('hsl(0,0%,5%)');
let buttonColor		= new Color('hsl(0,0%,10%)');

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
let ledRingCanvas = document.getElementById("ledRingCanvas");
let ledRingCtx = ledRingCanvas.getContext("2d");

let transitionPicker = document.getElementById("transitionPicker");

let transPickerGradCanvas = document.getElementById("transitionPickerHLGradient");
let transPickerGradCtx = transPickerGradCanvas.getContext("2d");

let hGrad = transPickerGradCtx.createLinearGradient(0, 0, transPickerGradCanvas.width, 0);
	hGrad.addColorStop(0   / 359, 'hsl(0,  100%,50%)');
	hGrad.addColorStop(60  / 359, 'hsl(60, 100%,50%)');
	hGrad.addColorStop(120 / 359, 'hsl(120,100%,50%)');
	hGrad.addColorStop(180 / 359, 'hsl(180,100%,50%)');
	hGrad.addColorStop(240 / 359, 'hsl(240,100%,50%)');
	hGrad.addColorStop(300 / 359, 'hsl(300,100%,50%)');
	hGrad.addColorStop(359 / 359, 'hsl(359,100%,50%)');
	transPickerGradCtx.fillStyle = hGrad;
	transPickerGradCtx.fillRect(0, 0, transPickerGradCanvas.width, transPickerGradCanvas.height);
	
let vGrad = transPickerGradCtx.createLinearGradient(0, 0, 0, transPickerGradCanvas.height);
	vGrad.addColorStop(0.49, 'hsla(0,0%,100%,0)');
	vGrad.addColorStop(1, 'hsla(0,0%,100%,1)');
	transPickerGradCtx.fillStyle = vGrad;
	transPickerGradCtx.fillRect(0, 0, transPickerGradCanvas.width, transPickerGradCanvas.height);
	vGrad = transPickerGradCtx.createLinearGradient(0, 0, 0, transPickerGradCanvas.height);
	vGrad.addColorStop(0, 'hsla(0,0%,0%,1)');
	vGrad.addColorStop(0.51, 'hsla(0,0%,0%,0)');
	transPickerGradCtx.fillStyle = vGrad;
	transPickerGradCtx.fillRect(0, 0, transPickerGradCanvas.width, transPickerGradCanvas.height);

let transPickerLineCanvas = document.getElementById("transitionPickerHLLine");
let transPickerLineCtx = transPickerLineCanvas.getContext("2d");
	transPickerLineCtx.lineWidth = 5;
	
let transPickerDotCanvas = document.getElementById("transitionPickerHLDot");
let transPickerDotCtx = transPickerDotCanvas.getContext("2d");
	
let rampParameterDisplay = document.getElementById("rampParameterDisplay");
let output = document.getElementById("output");

function colorToHLCoords(color){
	let h = (color.hue()/360) * transPickerGradCanvas.width;
	let l = (color.lightness()/100) * transPickerGradCanvas.height;
	return [h, l];
}

function HLCoordsToColor(h, l){
	//convert HL coordinates
	h = (h/transPickerGradCanvas.width) * 360;
	l = (l/transPickerGradCanvas.height) * 100;
	//clamp coordinates. They might be slightly over or under limits.
	h = Math.min(Math.max(h, 0), 360);
	l = Math.min(Math.max(l, 0), 100);
	let color = new Color();
	color.saturation(100);
	color.hue(h);
	color.lightness(l);
	return color;
}

function transPickerRedrawLine(cue){
	function drawEndCap(h, l, strokeStyle, fillStyle){
		ctx.beginPath();
		ctx.arc(h, l, 4, 0, 2 * Math.PI);
		ctx.strokeStyle = strokeStyle;
		ctx.fillStyle = fillStyle;
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.stroke();
	}
	
	let ctx = transPickerLineCtx;
	//clear canvas
	ctx.clearRect(0, 0, transPickerGradCanvas.width, transPickerGradCanvas.height);
	//get coordinates
	let [start_h, start_l] = colorToHLCoords(cue.start_color);
	let [end_h, end_l] = colorToHLCoords(cue.end_color);
	//calculate fitting gradient with relative negative lightness
	let l_grad_start = 100 - cue.start_color.lightness();
	let l_grad_end = 100 - cue.end_color.lightness();
	let color_grad_start = 'hsl(0,0%,' + l_grad_start + '%)';
	let color_grad_end = 'hsl(0,0%,' + l_grad_end + '%)';
	let lGrad = transPickerLineCtx.createLinearGradient(start_h, start_l, end_h, end_l);
		lGrad.addColorStop(0, color_grad_start);
		lGrad.addColorStop(1, color_grad_end);
	//draw line
	ctx.beginPath();
	ctx.moveTo(start_h, start_l);
	ctx.lineTo(end_h, end_l);
	ctx.strokeStyle = lGrad;
	ctx.lineWidth = 5;
	ctx.stroke();	
	//draw end caps
	drawEndCap(start_h, start_l, color_grad_start, cue.start_color);
	drawEndCap(end_h,	end_l, 	 color_grad_end,   cue.end_color);
}

function transPickerRedrawDot(color){
	let ctx = transPickerDotCtx;
	let radius = 6;
	ctx.clearRect(0, 0, transPickerGradCanvas.width, transPickerGradCanvas.height);
	ctx.beginPath();
	ctx.arc.apply(ctx, colorToHLCoords(color).concat([radius, 0, 2 * Math.PI]));
	ctx.fillStyle = color;
	ctx.fill();
	ctx.strokeStyle = 'hsl(0,0%,' + (100 - color.lightness()) + '%)';
	ctx.lineWidth = 2;
	ctx.stroke();
}

let pickingActive = false;
let closestDistance = transPickerGradCanvas.width + transPickerGradCanvas.height;
let closestIndex = Infinity;
let closestIsStart = true;
	

function relocateColorPoint(mouseH, mouseL){
	let newColor = HLCoordsToColor(mouseH, mouseL);
	if(closestIsStart){
		all_cues[closestIndex].start_color = newColor;
	} else {
		all_cues[closestIndex].end_color = newColor;
	}
	console.log(newColor.hex());
	transPickerRedrawLine(all_cues[closestIndex]);
}
	
function handleTransitionPickerMouseMove(e){
	let rect = transitionPicker.getBoundingClientRect();
	let mouseH = e.clientX - rect.left;
	let mouseL = e.clientY - rect.top;
	relocateColorPoint(mouseH, mouseL);
}

function handleTransitionPickerMouseDown(e){
	//prevent bubbling
	e.preventDefault();
	//make cursor invisible
	transitionPicker.style.cursor = "none";
	//add event handlers
	document.addEventListener("mouseup", handleTransitionPickerMouseUp);
	document.addEventListener("mousemove", handleTransitionPickerMouseMove);
	//caculate which colour is to be modified
	let rect = transitionPicker.getBoundingClientRect();
	let mouseH = e.clientX - rect.left;
	let mouseL = e.clientY - rect.top;
	closestDistance = transPickerGradCanvas.width + transPickerGradCanvas.height;
	closestIndex = Infinity;
	closestIsStart = true;
	for(let i in all_cues){
		let [startH, startL] 	= colorToHLCoords(all_cues[i].start_color);
		let [endH, endL] 		= colorToHLCoords(all_cues[i].end_color);
		let startDistance 	= Math.sqrt(Math.pow(startH - mouseH, 2) + Math.pow(startL - mouseL, 2));
		let endDistance 	= Math.sqrt(Math.pow(endH 	- mouseH, 2) + Math.pow(endL   - mouseL, 2));
		if(startDistance < closestDistance){
			closestDistance = startDistance;
			closestIndex	= i;
			closestIsStart	= true;
		}
		if(endDistance < closestDistance){
			closestDistance = endDistance;
			closestIndex	= i;
			closestIsStart	= false;
		}
	}
	//relocate colour point (important so that just clicking once also has an effect)
	relocateColorPoint(mouseH, mouseL);
}
transitionPicker.addEventListener("mousedown", handleTransitionPickerMouseDown);

function handleTransitionPickerMouseUp(e){
	//make cursor visible again
	transitionPicker.style.cursor = "crosshair";
	//add event handlers
	document.removeEventListener("mouseup", handleTransitionPickerMouseUp);
	document.removeEventListener("mousemove", handleTransitionPickerMouseMove);
}


//measurements in mm
let buttonR			= 4.9;
let ringR			= 5.45;
let ringWidth		= 0.9;
let caseRInner		= 6;
let caseREdge		= 6.75;
let caseROuter		= 9;

//above Radii are in mm, have to be scaled to pixels
let canvasScale = 20;

let ringX = ledRingCanvas.width/2;
let ringY = ledRingCanvas.height/2;

//set up canvas drawing context
ledRingCtx.imageSmoothingEnabled = true;
ledRingCtx.imageSmoothingQuality = "high";

//draw static parts to canvas
function drawCasePart(radius, color){
	ledRingCtx.fillStyle = color;
	ledRingCtx.beginPath();
	ledRingCtx.arc(ringX, ringY, radius * canvasScale, 0, 2 * Math.PI);
	ledRingCtx.fill();
}
drawCasePart(caseROuter, caseColorOuter);
drawCasePart(caseREdge, caseColorEdge);
drawCasePart(caseRInner, caseColorInner);
drawCasePart(buttonR, buttonColor);

//Event Handlers:
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
	ledRingCtx.lineWidth = ringWidth * canvasScale;
	ledRingCtx.strokeStyle = color;
	ledRingCtx.beginPath();
	ledRingCtx.arc(ringX, ringY, ringR * canvasScale, 
		(ledLastStartRad + ledsStepRad * index) * Math.PI, 
		(ledLastEndRad + ledsStepRad * index) * Math.PI
	);
	ledRingCtx.stroke();
};

//interpolate between two colours by applying ramp_type
function interpolate(start_color, end_color, factor, ramp_type, ramp_parameter){
	ramp_parameter = typeof ramp_parameter !== 'undefined' ? ramp_parameter : 0.5;
	
	//working letiables for HSL
	let startHSL = {
		hue 		: start_color.hue(),
		saturation 	: start_color.saturation(),
		lightness 	: start_color.lightness()
	};
	
	let endHSL = {
		hue 		: end_color.hue(),
		saturation 	: end_color.saturation(),
		lightness 	: end_color.lightness()
	};
	
	let resultHSL = {
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
		let resultColor = new Color(start_color);
		resultColor.interpolate(end_color, factor);
		return resultColor;
	}
}

//Set up cues
let cue1 = new Cue();
cue1.duration = new Date(3000);
cue1.ramp_type = "linearHSL";
cue1.ramp_parameter = 1;
cue1.time_divisor = numLeds;
//cue1.start_color = new Color('hsl(359, 100%, 50%)');
//cue1.end_color = new Color('hsl(0, 100%, 50%)');
cue1.start_color = new Color('#FF0000');
cue1.end_color = new Color('#FF0001');

transPickerRedrawLine(cue1);

let all_cues = [cue1];

//draw first ring
let currentColor = new Color('grey');

for(let i = 1; i <= numLeds; i++){
	if(i === numLeds){
		drawLed(i, new Color('green'));
	} else {
		drawLed(i, currentColor);
	}
}

//bootstrap times
let currentTimes = [];
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
	let currentColors = [];
	let duration = cue1.duration
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
	
	transPickerRedrawDot(currentColors[0]);
	
	//update times
	for(let i in currentTimes){
		currentTimes[i] = (currentTimes[i] + pollingInterval) % duration;
	}
}, pollingInterval);
//*/
