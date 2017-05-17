/// <reference path="./helpers/defaultValue.ts"/>
/// <reference path="./helpers/firstFreeIndex.ts"/>
/// <reference path="./cue.ts"/>
/// <reference path="./ringDisplay.ts"/>
/// <reference path="./transitionPicker.ts"/>

import drawLed 		= ringDisplay.drawLed;
import redrawLine 	= transitionPicker.line.redraw;
import redrawDot 	= transitionPicker.dot.redraw;
import clearLine	= transitionPicker.line.clear;
import clearDot 	= transitionPicker.dot.clear;

function init(){
	ringDisplay.init();
	transitionPicker.init();
}

//"use strict";

//constants
	const pollingInterval 	= 16;
	const numLeds 			= 12;
	const ledsStepRad 		= 2/numLeds;
	const ledsWidthRad 		= 0.156;
	const ledLastStartRad 	= 1.5 - ledsWidthRad/2;
	const ledLastEndRad 	= 1.5 + ledsWidthRad/2;
	const caseColorOuter	= new Color('hsl(0,0%,15%)');
	const caseColorEdge		= new Color('hsl(0,0%,10%)');
	const caseColorInner	= new Color('hsl(0,0%,5%)');
	const buttonColor		= new Color('hsl(0,0%,10%)');
//---

//helpers

	function numKeys(object: Object) : number {
		return Object.keys(object).length;
	}

	function cueBrowserItemByCueID(id: number){
		return document.querySelector('.cueItem[cueID="' + id + '"]');
	}

	function scheduleBrowserItemByScheduleID(id: number){
		return document.querySelector('.schedule[scheduleID="' + id + '"]');
	}

	function periodByCueID(id: number){
		return document.querySelector('.period[cueID="' + id + '"]');
	}
//---

//Timings
	let currentTime = 0;
	function resetTime(){
		currentTime = 0;
	}

	function updateTime(duration: number){
		currentTime = (currentTime + pollingInterval) % duration;
	}

	function timeForLED(cue: Cue, time: number, led: number){
		let id = cue.reverse ? led : (numLeds - led);
		return (time + ((cue.duration/cue.time_divisor) * id)) % cue.duration;
	}
//---

//get document elements
	let rampParameterDisplay = document.getElementById("rampParameterDisplay") as HTMLCanvasElement;
	let output = document.getElementById("output")!;

	let editChannelsInstructions = document.getElementById("editChannelsInstructions")!;
	let channelEditStartButton = document.getElementById("channelEditStartButton")!;
	let channelEditStopButton = document.getElementById("channelEditStopButton")!;

	let cueBrowser = document.getElementById("cueBrowser")!;

	let scheduleEditor = document.getElementById("scheduleEditor")!;
	let scheduleProgressBar = document.getElementById("scheduleProgressBar")!;

	let scheduleBrowser = document.getElementById("scheduleBrowser")!;

	let uploadAnchor = document.getElementById("uploadAnchor") as HTMLInputElement;
	//store empty file list now as it cannot be constructed later
	let emptyFileList = uploadAnchor.files!;
//---

//editor options objects
	let duration = document.getElementById("duration") as HTMLInputElement;
	let timeDivisor = document.getElementById("timeDivisor") as HTMLInputElement;
	let rampType = document.getElementById("rampType") as HTMLSelectElement;
	let rampParameter = document.getElementById("rampParameter") as HTMLInputElement;
	let reverse = document.getElementById("reverse") as HTMLInputElement;
	let wrapHue = document.getElementById("wrapHue") as HTMLInputElement;
//---

//encapsulating divs
	let rampParameterDiv = document.getElementById("rampParameterDiv")!;
	let wrapHueDiv = document.getElementById("wrapHueDiv")!;
	let cueEditor = document.getElementById("cueEditor")!;
//---

//Additional Options Collapsible
	let additionalOptions = document.getElementById("additionalOptions")!;
	function toggleOptions(){
		if(additionalOptions.hidden){
			additionalOptions.removeAttribute("hidden");
		}
		else{
			additionalOptions.setAttribute("hidden", "");
		}
	}
//---

//Event Handlers for options:
	function updateRampParameter(value: string){
		allCues[currentCueID].ramp_parameter = parseFloat(value);
		rampParameterDisplay.innerHTML = value;
	}
	function updateRampType(value: string){
		if(((RampType as any)[value]) != undefined){
				allCues[currentCueID].ramp_type = (RampType as any)[value];
				updateOptionVisibility(allCues[currentCueID]);
		} else {
				console.warn(`Tried to update ramp_type to invalid value "${value}".`);
		}
		
		
	}
	function updateDuration(value: string){
		allCues[currentCueID].duration = parseInt(value);
	}
	function updateTimeDivisor(value: string){
		allCues[currentCueID].time_divisor = parseInt(value);
	}
	function updateReverse(checked: boolean){
		allCues[currentCueID].reverse = checked;
	}
	function updateWrapHue(checked: boolean){
		allCues[currentCueID].wrap_hue = checked;
		redrawLine(allCues[currentCueID]);
	}

	function updateCueEditorValues(cue: Cue){
		updateOptionVisibility(cue);

		duration.value = cue.duration.toString();
		timeDivisor.value = cue.time_divisor.toString();
		rampType.value = RampType[cue.ramp_type];
		rampParameter.value = cue.ramp_parameter.toString();
		updateRampParameter(cue.ramp_parameter.toString());
		reverse.checked = cue.reverse;
		wrapHue.checked = cue.wrap_hue;
	}

	function updateOptionVisibility(cue: Cue){
		switch(cue.ramp_type){
			case RampType.jump:
				rampParameterDiv.removeAttribute("hidden");
				wrapHueDiv.setAttribute("hidden", "");
				break;
			case RampType.linearHSL:
				rampParameterDiv.removeAttribute("hidden");
				wrapHueDiv.removeAttribute("hidden");
				break;
			default:
				rampParameterDiv.setAttribute("hidden", "");
				wrapHueDiv.setAttribute("hidden", "");		
		}
	}

	function startChannelEditing(){
		ringDisplay.startChannelEditing();
		channelEditStartButton.setAttribute("hidden", "");
		channelEditStopButton.removeAttribute("hidden");
		editChannelsInstructions.removeAttribute("hidden");
	}

	function stopChannelEditing(){
		ringDisplay.startChannelEditing();
		channelEditStartButton.removeAttribute("hidden");
		channelEditStopButton.setAttribute("hidden", "");
		editChannelsInstructions.setAttribute("hidden", "");
	}

	function toggleChannel(ledID: number){
		allCues[currentCueID].channels[ledID] = !allCues[currentCueID].channels[ledID];
	}
//---

//Schedule Editor helpers, functions and event handlers
	function totalDuration(scheduleID: number){
		let schedule = allSchedules[scheduleID];
		let total = 0;

		for(let i in schedule.periods){
			let period = schedule.periods[i];
			let t = period.delay + allCues[period.cue_id].duration;
			if(t > total){
				total = t;
			}
		}

		return total;
	}

	function updateProgressBarHeight(){
		scheduleProgressBar.style.height = scheduleEditor.getBoundingClientRect().height + "px";
	}

	function updateProgressBarPosition(){
		let baseline = scheduleEditor.getBoundingClientRect().left;
		let rightmost = 0;
		for(let i in scheduleEditor.children){
			let listItem = scheduleEditor.children.item(parseInt(i));
			let right = listItem.getBoundingClientRect().right - baseline;
			if(right > rightmost){
				rightmost = right;
			}
		}

		let progress = currentTime / totalDuration(currentScheduleID);
		scheduleProgressBar.style.left = baseline + progress * rightmost + "px";
	}
//---

//Cue Management
	let currentCueID = NaN;
	let allCues: Cue[] = [];
	let activeCueIndices:number[] = [];

	function closeCue(index: number){
		//currentCueID is NOT set to NaN here! Keep it this way! 
		//Better render a few false frames than let the display die
		let elem = cueBrowserItemByCueID(index);
		if (elem != null){
			stopChannelEditing();
			elem.removeAttribute("active");
			clearLine();
			clearDot();
			currentCueID = NaN;
		}
	}

	function openCue(index: number){
		closeCue(currentCueID);
		closeSchedule(currentScheduleID);
		openCueEditor();

		currentCueID = index;
		activeCueIndices = [index];
		let cueItem = cueBrowserItemByCueID(index);
		if (cueItem instanceof Element){
			cueItem.setAttribute("active", "");
		} else {
			console.warn(`Tried to open cue with index ${index}, but it didn't exist.`)
		}
		//TODO: Update all the values displayed in editor
		redrawLine(allCues[currentCueID]);
		updateCueEditorValues(allCues[currentCueID]);
		resetTime();
	}

	function deleteCue(index: number){
		if (numKeys(allCues) <= 0){
			return;
		}
		if (currentCueID == index){
			closeCue(index);
		}
		
		let cueItem = cueBrowserItemByCueID(index);
		if (cueItem instanceof Element){
			cueBrowser.removeChild(cueItem);
		} else {
			console.warn(`Tried to remove cue with index ${index}, but it didn't exist.`)
		}
		
		deletePeriods(index);
		delete allCues[index];
	}

	function createCue(){
		let id = firstFreeIndex(allCues); 
		let template = document.getElementById("cueTemplate")!.cloneNode(true) as Element;
		template.removeAttribute("hidden");
		template.setAttribute("cueID", "" + id);
		template.removeAttribute("id");
		
		//Modify openCue button from template
		let openCueButton = template.getElementsByClassName("openCue")[0] as HTMLInputElement;
		openCueButton.value = "Cue " + id;
		openCueButton.addEventListener("click", function(){openCue(id)});
		
		//Modify deleteCue button from template
		let deleteCueButton = template.getElementsByClassName("deleteCue")[0] as HTMLInputElement;
		deleteCueButton.addEventListener("click", function(){deleteCue(id)});
		
		//create cue object
		let cue = new Cue();
		allCues[id] = cue;
		
		//display fully prepared element
		cueBrowser.appendChild(template);
		
		openCue(id);
	}

	function openCueEditor(){
		closeScheduleEditor();
		cueEditor.removeAttribute("hidden");
	}

	function closeCueEditor(){
		cueEditor.setAttribute("hidden", "");
	}

	function downloadJSON(){
		let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allCues, null, 2));
		let dlAnchorElem = document.getElementById('downloadAnchor') as HTMLInputElement;
		dlAnchorElem.setAttribute("href",     dataStr     );
		dlAnchorElem.setAttribute("download", "AllCues.json");
		dlAnchorElem.click();
	}

	function uploadJSON(files: FileList){
		if (files.length <= 0){
			return;
		}
		let file = files[0];
		let reader = new FileReader();
		
		reader.onload = function(e: Event){
			let data: string = reader.result;
			try {
				let loadedCues = JSON.parse(data, 
				function(key: string, value: Object){
					//this check is enough because the Cue constructor is very permissive
					if(value.hasOwnProperty('start_color')){
						return new Cue(value as CueSerialized);
					}
					return value;
				});
				
				//remove all existing cues (store length first because it will change)
				for (let i = Object.keys(allCues).length; i > 0; i--){
					deleteCue(0);
				}
				
				//add newly loaded Cues
				for (let i in loadedCues){
					createCue();
					(allCues as any)[i] = loadedCues[i];
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
//---

//Schedule management
	let currentScheduleID = NaN;
	let allSchedules: Schedule[] = [];

	function deletePeriods(index: number){
		let period; 
		while((period = periodByCueID(index)) !== null){
			scheduleEditor.removeChild(period);
		}

		for(let i in allSchedules){
			for(let j in allSchedules[i].periods){
				if(allSchedules[i].periods[j].cue_id == index){
					delete allSchedules[i].periods[j];
				}
			}
		}
	}

	function dropCueIntoSchedule(event: DragEvent){
		let cueID = event.dataTransfer.getData("cueID");
		if (event.dataTransfer.getData("task") === "copy"){
			addPeriod(parseInt(cueID));
		}
	}

	function dragCue(elem: Element, event: DragEvent){
		if(elem.hasAttribute("cueID")){
			event.dataTransfer.setData("task", "copy");
			event.dataTransfer.setData("cueID", elem.getAttribute("cueID")!);
		} else {
			console.log(`Tried to drag element ${elem}, but its cueID attribute wasn't set.`)
		}
	}

	function dragPeriod(elem: Element, event: DragEvent){
		if(elem.hasAttribute("cueID")){
			event.dataTransfer.setData("task", "reorder");
			event.dataTransfer.setData("cueID", elem.getAttribute("cueID")!);
		} else {
			console.log(`Tried to drag element ${elem}, but its cueID attribute wasn't set.`)
		}
	}

	function createPeriod(id: number){
		let periodID = firstFreeIndex(allSchedules[currentScheduleID].periods);
		let template = document.getElementById("periodTemplate")!.cloneNode(true) as HTMLElement;
		template.removeAttribute("hidden");
		template.setAttribute("cueID", "" + id);
		template.setAttribute("periodID", "" + periodID);
		template.removeAttribute("id");

		//Modify openCue button from template
		let openCueButton = template.getElementsByClassName("openCue")[0] as HTMLInputElement;
		openCueButton.value = "Cue " + id;
		openCueButton.addEventListener("click", function(){/*openCueItem(template)*/});
		

		template.addEventListener("mousedown", function(event : MouseEvent){
			let leftLower = scheduleEditor.getBoundingClientRect().left + event.offsetX;
			let start = event.pageX;
			let diff = 0;
			
			let mousemove = function(event: MouseEvent){
				diff = event.pageX - leftLower;
				if (diff >= 0 && diff < 240){
					template.style.left = diff + "px";
				}
			}

			document.body.addEventListener("mousemove", mousemove);

			//remove event listener after dragging has been completed
			document.body.addEventListener("mouseup", function(){
				document.body.removeEventListener("mousemove", mousemove)
			});
		});
	
		//display fully prepared element
		scheduleEditor.appendChild(template);
		updateProgressBarHeight();
	}

	function addPeriod(id: number){
		createPeriod(id);
		let itemID = firstFreeIndex(allSchedules[currentScheduleID].periods);
		allSchedules[currentScheduleID].periods[itemID] = new Period(id);
	}

	function createSchedule(){
		let id = firstFreeIndex(allSchedules); 
		let template = document.getElementById("scheduleTemplate")!.cloneNode(true) as Element;
		template.removeAttribute("hidden");
		template.setAttribute("scheduleID", "" + id);
		template.removeAttribute("id");
		
		//Modify openCue button from template
		let openScheduleButton = template.getElementsByClassName("openSchedule")[0] as HTMLInputElement;
		openScheduleButton.value = "Schedule " + id;
		openScheduleButton.addEventListener("click", function(){openSchedule(id)});
		
		//Modify deleteCue button from template
		let deleteScheduleButton = template.getElementsByClassName("deleteSchedule")[0];
		deleteScheduleButton.addEventListener("click", function(){deleteSchedule(id)});
		
		//create Schedule object
		let schedule = new Schedule(undefined);
		allSchedules[id] = schedule;
		
		//display fully prepared element
		scheduleBrowser.appendChild(template);
		
		openSchedule(id);
	}

	function openSchedule(index: number){
		closeCue(currentCueID);
		closeSchedule(currentScheduleID);
		openScheduleEditor();

		currentScheduleID = index;
		let schedule = allSchedules[index];

		let scheduleElement = scheduleBrowserItemByScheduleID(index);
		if(scheduleElement instanceof Element){
			scheduleElement.setAttribute("active", "");
		} else {
			console.warn(`Tried to open schedule at index ${index}, but it didn't exist.`);
		}

		for(let i in schedule.periods){
			createPeriod(schedule.periods[i].cue_id);
		}

		resetTime();
	}

	function openScheduleEditor(){
		closeCueEditor();
		scheduleEditor.removeAttribute("hidden");
		scheduleProgressBar.removeAttribute("hidden");
	}

	function closeScheduleEditor(){
		scheduleEditor.setAttribute("hidden", "");
		scheduleProgressBar.setAttribute("hidden", "");
	}

	function closeSchedule(index: number){
		index = defaultValue(index, currentScheduleID);
		let elem = scheduleBrowserItemByScheduleID(index);
		if (elem != null){
			elem.removeAttribute("active");
			clearLine();
			clearDot();
			clearScheduleEditor();
			currentScheduleID = NaN;
		}
	}

	function deleteSchedule(index: number){
		if (numKeys(allSchedules) <= 0){
			return;
		}
		if (currentScheduleID == index){
			closeSchedule(index);
		}
		
		let scheduleElement = scheduleBrowserItemByScheduleID(index);
		if(scheduleElement instanceof Element){
			scheduleBrowser.removeChild(scheduleElement);
		
		} else {
			console.warn(`Tried to delete schedule at index ${index}, but it didn't exist.`);
		}

		delete allSchedules[index];
		
		currentScheduleID = NaN;
	}

	function clearScheduleEditor(){
		for(let i = scheduleEditor.children.length; i > 0; i--){
			scheduleEditor.removeChild(scheduleEditor.children[0]);
		}
	}
//---

//interpolate between start and end colour of a cue
function interpolate(cue: Cue, progress: number) : Color{
	let start_color = cue.start_color;
	let end_color = cue.end_color;
	let ramp_type = cue.ramp_type;
	let ramp_parameter = cue.ramp_parameter;
	let wrap_hue = cue.wrap_hue;

	function linear(start: number, end: number, wrapHue = false){
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

	let result = new Color();
	switch(ramp_type){
		case RampType.jump:
			if (progress > ramp_parameter){
				return end_color;
			} else {
				return start_color;
			}
		case RampType.linearHSL:
			result.hue(			linear(start_color.hue(), 		end_color.hue(), wrap_hue));
			result.saturation(	linear(start_color.saturation(), end_color.saturation()));
			result.lightness(	linear(start_color.lightness(), 	end_color.lightness()));
			return result;
		case RampType.linearRGB:
			result.red(			linear(start_color.red(), 	end_color.red()))
			result.green(		linear(start_color.green(), 	end_color.green()))
			result.blue(		linear(start_color.blue(), 	end_color.blue()));
			return result;
	}
}

//Set up cues

//prepare cues
	createCue();

	createCue();
	allCues[1].duration = 3800;
	allCues[1].ramp_parameter = 0.38;
	allCues[1].time_divisor = 1;
	allCues[1].start_color = new Color('hsl(8, 100%, 5%)');
	allCues[1].end_color = new Color('hsl(84, 100%, 62%)');

	createCue();
	allCues[2].duration = 900;
	allCues[2].ramp_type = RampType.jump;
	allCues[2].ramp_parameter = 0.5;
	allCues[2].start_color = new Color('#FAFF03');
	allCues[2].end_color = new Color('#FF00E6');
	allCues[2].reverse = true;

	createCue();
	allCues[3].duration = 60000;
	allCues[3].ramp_type = RampType.jump;
	allCues[3].ramp_parameter = 0.08;
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
//---

//draw test ring
for(let i = 1; i <= numLeds; i++){
	if(i === numLeds){
		drawLed(i, new Color('green'));
	} else {
		drawLed(i, new Color('grey'));
	}
}


function drawCue(id: number){
	if(id >= 0){
		let currentColor = new Color('black');; 
		let cue = allCues[id];
		let duration = cue.duration;

		for(let i = numLeds - 1; i >= 0; i--){
			if(cue.channels[i]){
				currentColor = interpolate(cue, timeForLED(cue, currentTime, i)/duration);
				
			} else {
				currentColor = new Color('black');
			}
			drawLed(i, currentColor);
		}

		//redraw dot for colour of topmost LED
		redrawDot(currentColor);
		updateTime(allCues[currentCueID].duration);
	}
	else {
		//draw black onto the display if there's no cue to read from
		let currentColors = Array(numLeds).fill(new Color('black'), 0, numLeds);
		for(let i = 0; i < numLeds; i++){
			drawLed(i, currentColors[i]);
		}
		redrawDot(currentColors[0]);
	}
}

//*
//Main loop
//TODO: Remove this!
	createCue();
	allCues[7].channels = [true, true, true, true, true, true, false, false, false, false, false, false];

	createCue();
	allCues[8].reverse = true;
	allCues[8].channels = [false, false, false, false, false, false, true, true, true, true, true, true];

	createSchedule();
	allSchedules[0].periods = [new Period(8), new Period(7)];
	
	openSchedule(0);
//---

init();
window.setInterval(function () {
	if(currentScheduleID >= 0){
		let schedule = allSchedules[currentScheduleID];

		//determine total duration of schedule
		let totalDur = totalDuration(currentScheduleID);

		//determine which cues are visible
		let time = currentTime % totalDur;
		let visibleCues: Cue[] = [];
		for(let i in schedule.periods){
			let period = schedule.periods[i];
			let cue = allCues[period.cue_id];
			if(
				period.delay <= time && 
				period.delay + cue.duration >= time
				){
					visibleCues.push(cue);
			}
		}

		let finalColors: Color[] = [];
		//calculate colours for each LED
		for(let i = numLeds - 1; i >= 0; i--){
			let colors: Color[] = [];
			for(let cue of visibleCues){
				if(cue.channels[i]){
					colors.push(interpolate(cue, timeForLED(cue, time, i)/cue.duration));
				}
			}

			//TODO: Actually mix colors!
			finalColors[i] = colors[0];
		}	

		for(let i in finalColors){
			drawLed(parseInt(i), finalColors[i]);
		}

		redrawDot(finalColors[0]);
		updateTime(totalDur);
		updateProgressBarPosition();
	}
	else{
		drawCue(currentCueID);
	}
	
}, pollingInterval);
//*/
