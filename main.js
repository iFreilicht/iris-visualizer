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

//measurements in mm
let buttonR			= 4.9;
let ringR			= 5.45;
let ringWidth		= 0.9;
let caseRInner		= 6;
let caseREdge		= 6.75;
let caseROuter		= 9;

function defaultValue(value, defaultValue){
	if(typeof value != "undefined"){
		return value;
	}
	else{
		return defaultValue;
	}
}

//define Cue constructor
//p is an optional parameter object
function Cue(p){
	if (typeof p == "undefined"){
		p = {};
	}
	this.channels 		= defaultValue(p.channels, Array(numLeds).fill(true,0,numLeds));
	this.reverse 		= defaultValue(p.reverse, 			false					);
	this.wrap_hue 		= defaultValue(p.wrap_hue, 			false					);
	this.time_divisor 	= defaultValue(p.time_divisor,		numLeds					);
	this.delay 			= defaultValue(p.delay,				0						);
	this.duration 		= defaultValue(p.duration,			3000					);
	this.ramp_type 		= defaultValue(p.ramp_type,			'linearHSL'				);
	this.ramp_parameter = defaultValue(p.ramp_parameter,	1						);
	this.start_color 	= new Color(defaultValue(p.start_color,		'#FF0000')	);
	this.end_color 		= new Color(defaultValue(p.end_color, 		'#FF0001')	);
	this.offset_color 	= new Color(defaultValue(p.offset_color,	'black')	);
};

Cue.prototype.toJSON = function(){
	//leave out all unused fields for now
	return {
		//channels: this.channels,
		reverse: this.reverse,
		wrap_hue: this.wrap_hue,
		time_divisor: this.time_divisor,
		//delay: this.delay,
		duration: this.duration,
		ramp_type: this.ramp_type,
		ramp_parameter: this.ramp_parameter,
		start_color: this.start_color.getHSL(),
		end_color: this.end_color.getHSL(),
		//offset_color: this.offset_color.getHSL()
	};
}

//bootstrap times
let currentTimes = [];
function resetTimes(){
	currentTimes = [];
	let cue = allCues[currentCueIndex];
	for(let i = 0; i < numLeds; i++){
		currentTimes.push((cue.duration/cue.time_divisor) * i);
	}
	
	//this might look wrong, but to make the animation spin clockwise (which is
	//considered to be the non-reversed direction) the time array has to be reversed.
	//also, the first LED should stay in position 0 because it is where the animation is starting
	if(!allCues[currentCueIndex].reverse){
		currentTimes = currentTimes.splice(0,1).concat(currentTimes.reverse());
	}
}

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

let transPickerLineCanvas = document.getElementById("transitionPickerHLLine");
let transPickerLineCtx = transPickerLineCanvas.getContext("2d");

let transPickerDotCanvas = document.getElementById("transitionPickerHLDot");
let transPickerDotCtx = transPickerDotCanvas.getContext("2d");
	
let rampParameterDisplay = document.getElementById("rampParameterDisplay");
let output = document.getElementById("output");

let cueBrowser = document.getElementById("cueBrowser");

let uploadAnchor = document.getElementById("uploadAnchor");
//store empty file list now as it cannot be constructed
let emptyFileList = uploadAnchor.files;

let duration = document.getElementById("duration");
let timeDivisor = document.getElementById("timeDivisor");
let rampType = document.getElementById("rampType");
let rampParameter = document.getElementById("rampParameter");
let reverse = document.getElementById("reverse");
let wrapHue = document.getElementById("wrapHue");

//Transition Picker variables
let pickingActive = false;
let closestDistance = transPickerGradCanvas.width + transPickerGradCanvas.height;
let closestIndex = Infinity;
let closestIsStart = true;

//Transition Picker helpers
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

//Transition Picker drawing functions
function transPickerRedrawLine(cue){
	let ctx = transPickerLineCtx;
	//clear canvas
	ctx.clearRect(0, 0, transPickerGradCanvas.width, transPickerGradCanvas.height);
	//get coordinates
	let [start_h, start_l] = colorToHLCoords(cue.start_color);
	let [end_h, end_l] = colorToHLCoords(cue.end_color);
	//calculate gradient colors with relative negative lightness
	let l_grad_start = 100 - cue.start_color.lightness();
	let l_grad_end = 100 - cue.end_color.lightness();
	let color_grad_start = 'hsl(0,0%,' + l_grad_start + '%)';
	let color_grad_end = 'hsl(0,0%,' + l_grad_end + '%)';

	//draw line
	function drawLine(start_h, start_l, end_h, end_l){
		ctx.beginPath();
		ctx.lineWidth = 5;
		let lGrad = transPickerLineCtx.createLinearGradient(start_h, start_l, end_h, end_l);
			lGrad.addColorStop(0, color_grad_start);
			lGrad.addColorStop(1, color_grad_end);
		ctx.strokeStyle = lGrad;
		ctx.moveTo(start_h, start_l);
		ctx.lineTo(end_h, end_l);		
		ctx.stroke();
	}

	if(cue.wrap_hue){
		drawLine(start_h, start_l, end_h + transPickerGradCanvas.width, end_l);
		drawLine(start_h - transPickerGradCanvas.width, start_l, end_h, end_l);
	}else{
		drawLine(start_h, start_l, end_h, end_l);
	}

	//draw end caps
	function drawEndCap(h, l, strokeStyle, fillStyle){
		ctx.beginPath();
		ctx.arc(h, l, 4, 0, 2 * Math.PI);
		ctx.strokeStyle = strokeStyle;
		ctx.fillStyle = fillStyle;
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.stroke();
	}

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

function redrawTransitionPickerGradient(){
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
}
	
function relocateColorPoint(mouseH, mouseL){
	let newColor = HLCoordsToColor(mouseH, mouseL);
	if(closestIsStart){
		allCues[closestIndex].start_color = newColor;
	} else {
		allCues[closestIndex].end_color = newColor;
	}
	transPickerRedrawLine(allCues[closestIndex]);
}
	
//Transition Picker event handlers
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
	for(let i of activeCueIndices){
		let [startH, startL] 	= colorToHLCoords(allCues[i].start_color);
		let [endH, endL] 		= colorToHLCoords(allCues[i].end_color);
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

//Additional Options Collapsible
let add = document.getElementById("additionalOptions");
function toggleOptions(){
	additionalOptions.style.display = 
		additionalOptions.style.display === "block" ? "none" : "block";
}

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

//Event Handlers for simple options:
function updateRampParameter(value){
	allCues[currentCueIndex].ramp_parameter = value;
	rampParameterDisplay.innerHTML = value;
}
function updateRampType(value){
	allCues[currentCueIndex].ramp_type = value;
}
function updateDuration(value){
	allCues[currentCueIndex].duration = parseInt(value);
	resetTimes();
}
function updateTimeDivisor(value){
	allCues[currentCueIndex].time_divisor = parseInt(value);
	resetTimes();
}
function updateReverse(checked){
	allCues[currentCueIndex].reverse = checked;
	resetTimes();
}
function updateWrapHue(checked){
	allCues[currentCueIndex].wrap_hue = checked;
	transPickerRedrawLine(allCues[currentCueIndex]);
}

//Cue Management
function indexOfCueItem(elem){
	return Array.prototype.slice.call(
		cueBrowser.getElementsByClassName("cueItem")
	).indexOf(elem);
}

function closeCue(index){
	//currentCueIndex is NOT set to NaN here! Keep it this way! 
	//Better render a few false frames than let the display die
	let elem = cueBrowser.getElementsByClassName("cueItem")[index];
	if (typeof elem != "undefined"){
		elem.removeAttribute("active");
	}
}

function openCueItem(elem){
	openCue(indexOfCueItem(elem));
}

function openCue(index){
	if (currentCueIndex >= 0){
		closeCue(currentCueIndex);
	}
	currentCueIndex = index;
	activeCueIndices = [index];
	let cueItem = cueBrowser.getElementsByClassName("cueItem")[index];
	cueItem.setAttribute("active",undefined);
	//TODO: Update all the values displayed in editor
	transPickerRedrawLine(allCues[currentCueIndex]);
	updateCueEditorValues(allCues[currentCueIndex])
	resetTimes();
}

function deleteCueItem(elem){
	deleteCue(indexOfCueItem(elem));
}

function deleteCue(index){
	if (allCues.length <= 0 || !(allCues.length > index)){
		return;
	}
	//additional steps will have to be taken when the current index changes
	let reIndex = index <= currentCueIndex;
	closeCue(index);
	
	cueBrowser.removeChild(cueBrowser.getElementsByClassName("cueItem")[index]);
	allCues.splice(index, 1);
	
	if (reIndex){
		if (currentCueIndex == 0){
			if (allCues.length > 0){
				openCue(0);
			} else {
				//if no cues are leftover
				currentCueIndex = NaN;
			}		
		} else {
			openCue(currentCueIndex - 1);
		}
	}
}

function createCue(){
	let id = allCues.length; 
	let template = document.getElementById("cueTemplate").cloneNode(true);
	template.style.display = "block";
	
	//Modify openCue button from template
	let openCueButton = template.getElementsByClassName("openCue")[0];
	openCueButton.value = "Cue " + allCues.length;
	openCueButton.addEventListener("click", function(){openCueItem(template)});
	
	//Modify deleteCue button from template
	let deleteCueButton = template.getElementsByClassName("deleteCue")[0];
	deleteCueButton.addEventListener("click", function(){deleteCueItem(template)});
	
	//create cue object
	let cue = new Cue();
	allCues.push(cue);
	
	//display fully prepared element
	cueBrowser.appendChild(template);
	
	openCue(id);
}

function updateCueEditorValues(cue){
	duration.value = cue.duration;
	timeDivisor.value = cue.time_divisor;
	rampType.value = cue.ramp_type;
	rampParameter.value = cue.ramp_parameter;
	updateRampParameter(cue.ramp_parameter);
	reverse.checked = cue.reverse;
	wrapHue.checked = cue.wrap_hue;
}

function downloadJSON(){
	let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allCues, null, 2));
	let dlAnchorElem = document.getElementById('downloadAnchor');
	dlAnchorElem.setAttribute("href",     dataStr     );
	dlAnchorElem.setAttribute("download", "AllCues.json");
	dlAnchorElem.click();
}

function uploadJSON(files){
	if (files.length <= 0){
		return;
	}
	let file = files[0];
	let reader = new FileReader();
	
	reader.onload = function(e){
		 let data = reader.result;
		 try {
			let loadedCues = JSON.parse(data, 
			function(key, value){
				//this check is enough because the Cue constructor is very permissive
				if(typeof value.start_color != 'undefined'){
					return new Cue(value);
				}
				return value;
			});
			
			//remove all existing cues
			for (let i in allCues){
				deleteCue(0);
			}
			
			//add newly loaded Cues
			for (let i in loadedCues){
				createCue();
				allCues[i] = loadedCues[i];
			}
			
			openCue(0);			
		 }
		 catch (e){
			alert("Sorry, the file you supplied could not be read properly. "
					+"More info can be found in the console log. (F12)")
			console.log(e);
		 }
	}
	
	reader.readAsText(file);
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

//interpolate between start and end colour of a cue,
function interpolate(cue, progress){
	let start_color = cue.start_color;
	let end_color = cue.end_color;
	let ramp_type = cue.ramp_type;
	let ramp_parameter = cue.ramp_parameter;
	let wrap_hue = cue.wrap_hue;

	function linear(start, end, wrapHue){
		if (typeof wrapHue === "undefined") wrapHue = false;
		//factor is a sawtooth function
		let factor = progress < ramp_parameter ? 
			progress / ramp_parameter :
			1 - (progress - ramp_parameter)/(1 - ramp_parameter);

		let delta = end - start;
		if (wrapHue){
			let result = start + (delta + 360) * factor;
			//calculate modulo so that it behaves with negative numbers
			result = ((result % 360) + 360) % 360;
			return result;
		}
		else{
			return start + delta * factor;
		}
	}

	switch(ramp_type){
	case "jump":
		if (progress + 0.02 > ramp_parameter){
			return new Color(end_color);
		} else {
			return new Color(start_color);
		}
	case "linearHSL":
		let result = new Color();
		result.hue(			linear(start_color.hue(), 			end_color.hue(), wrap_hue));
		result.saturation(	linear(start_color.saturation(), 	end_color.saturation()));
		result.lightness(	linear(start_color.lightness(), 	end_color.lightness()));
		return result;
	case "linearRGB":
		let resultColor = new Color(start_color);
		resultColor.interpolate(end_color, progress);
		return resultColor;
	}
}

//Set up cues
let currentCueIndex = NaN;
let allCues = [];
let activeCueIndices = [];

createCue();

createCue();
allCues[1].duration = 3800;
allCues[1].ramp_parameter = 0.38;
allCues[1].time_divisor = 1;
allCues[1].start_color = new Color('hsl(8, 100%, 5%)');
allCues[1].end_color = new Color('hsl(84, 100%, 62%)');

createCue();
allCues[2].duration = 900;
allCues[2].ramp_type = "jump";
allCues[2].ramp_parameter = 0.52;
allCues[2].start_color = new Color('#FAFF03');
allCues[2].end_color = new Color('#FF00E6');
allCues[2].reverse = true;

createCue();
allCues[3].duration = 60000;
allCues[3].ramp_type = "jump";
allCues[3].ramp_parameter = 0.1;
allCues[3].start_color = new Color('white');
allCues[3].end_color = new Color('black');

createCue();
allCues[4].duration = 3500;
allCues[4].start_color = new Color('hsl(121, 100%, 95%)');
allCues[4].end_color = new Color('hsl(307, 100%, 15%)');

createCue();
allCues[5].duration = 700;
allCues[5].time_divisor = 6;
allCues[5].ramp_parameter = 0.5;
allCues[5].start_color = new Color('hsl(272, 100%, 6%)');
allCues[5].end_color = new Color('hsl(184, 100%, 51%)');

createCue();
allCues[6].wrap_hue = true;
allCues[6].start_color = new Color('hsl(310, 100%, 50%)');
allCues[6].end_color = new Color('hsl(103, 100%, 95%)');

// first time setup
openCue(6);
redrawTransitionPickerGradient();

//draw test ring
for(let i = 1; i <= numLeds; i++){
	if(i === numLeds){
		drawLed(i, new Color('green'));
	} else {
		drawLed(i, new Color('grey'));
	}
}

//*
//Main loop
let currentColors = [];
let currentCue = allCues[currentCueIndex];
window.setInterval(function () {
	//currentCueIndex might be NaN
	if(currentCueIndex >= 0){
		currentColors = [];
		currentCue = allCues[currentCueIndex];
		let duration = allCues[currentCueIndex].duration;
		for(let i = 0; i < numLeds; i++){
			currentColors.push(new Color(currentCue.start_color));
			currentColors[i] = interpolate(currentCue, currentTimes[i]/duration);
			drawLed(i, currentColors[i]);
		}
		
		transPickerRedrawDot(currentColors[0]);
	
		//update times
		for(let i in currentTimes){
			currentTimes[i] = (currentTimes[i] + pollingInterval) % duration;
		}
	}
	else {
		//draw black onto the display if there's no cue to read from
		currentColors = Array(numLeds).fill(new Color('black'),0,numLeds);
		for(let i = 0; i < numLeds; i++){
			drawLed(i, currentColors[i]);
		}
		transPickerRedrawDot(currentColors[0]);
	}
}, pollingInterval);
//*/
