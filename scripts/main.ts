/// <reference path="./helpers/defaultValue.ts"/>
/// <reference path="./cue.ts"/>


//"use strict";

//constants
	let pollingInterval = 16;
	let numLeds 		= 12;
	let ledsStepRad 	= 2/numLeds;
	let ledsWidthRad 	= 0.156;
	let ledLastStartRad = 1.5 - ledsWidthRad/2;
	let ledLastEndRad 	= 1.5 + ledsWidthRad/2;
	let caseColorOuter	= Color('hsl(0,0%,15%)');
	let caseColorEdge	= Color('hsl(0,0%,10%)');
	let caseColorInner	= Color('hsl(0,0%,5%)');
	let buttonColor		= Color('hsl(0,0%,10%)');
//---

//helpers

	function numKeys(object: Object) : number {
		return Object.keys(object).length;
	}

	function smallestUnusedID(object: Object) : number{
		let numIDs = numKeys(object);
		for(let i = 0; i <= numIDs; i++){
			if(typeof object[i] === "undefined"){
				return i;
			}
		}
		return numIDs;
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
	let ringDisplay = document.getElementById("ringDisplay")!;
	let ledHitboxDiv = document.getElementById("ledHitboxDiv")!;
	let ledRingCanvas = document.getElementById("ledRingCanvas") as HTMLCanvasElement;
	let ledRingCtx = ledRingCanvas.getContext("2d") as CanvasRenderingContext2D;

	let transitionPicker = document.getElementById("transitionPicker")!;

	let transPickerGradCanvas = document.getElementById("transitionPickerHLGradient") as HTMLCanvasElement;
	let transPickerGradCtx = transPickerGradCanvas.getContext("2d") as CanvasRenderingContext2D;

	let transPickerLineCanvas = document.getElementById("transitionPickerHLLine") as HTMLCanvasElement;
	let transPickerLineCtx = transPickerLineCanvas.getContext("2d") as CanvasRenderingContext2D;

	let transPickerDotCanvas = document.getElementById("transitionPickerHLDot") as HTMLCanvasElement;
	let transPickerDotCtx = transPickerDotCanvas.getContext("2d") as CanvasRenderingContext2D;
		
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


//Transition Picker variables
	let pickingActive = false;
	let closestDistance = transPickerGradCanvas.width + transPickerGradCanvas.height;
	let closestIndex = Infinity;
	let closestIsStart = true;
//---

//Transition Picker helpers
	function colorToHLCoords(color: Color){
		let h = (color.getHue()/360) * transPickerGradCanvas.width;
		let l = (color.getLightness()) * transPickerGradCanvas.height;
		return [h, l];
	}

	function HLCoordsToColor(h: number, l: number){
		//convert HL coordinates
		h = (h/transPickerGradCanvas.width) * 360;
		l = (l/transPickerGradCanvas.height);
		//clamp coordinates. They might be slightly over or under limits.
		h = Math.min(Math.max(h, 0), 360);
		l = Math.min(Math.max(l, 0), 1);
		return Color()
		.setSaturation(100)
		.setHue(h)
		.setLightness(l);
	}
//---

//Transition Picker drawing functions
	function transPickerRedrawLine(cue: Cue){
		let ctx = transPickerLineCtx;
		//clear canvas
		transPickerClearLine();
		//get coordinates
		let [start_h, start_l] = colorToHLCoords(cue.start_color);
		let [end_h, end_l] = colorToHLCoords(cue.end_color);
		//calculate gradient colors with relative negative lightness
		let l_grad_start = (1 - cue.start_color.getLightness()) * 100;
		let l_grad_end = (1 - cue.end_color.getLightness()) * 100;
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

	function transPickerClearLine(){
		let ctx = transPickerLineCtx;
		ctx.clearRect(0, 0, transPickerGradCanvas.width, transPickerGradCanvas.height);
	}

	function transPickerRedrawDot(color: Color){
		color = defaultValue(color, Color('black'));
		let ctx = transPickerDotCtx;
		let radius = 6;
		ctx.clearRect(0, 0, transPickerGradCanvas.width, transPickerGradCanvas.height);
		ctx.beginPath();
		ctx.arc.apply(ctx, colorToHLCoords(color).concat([radius, 0, 2 * Math.PI]));
		ctx.fillStyle = color.toString();
		ctx.fill();
		ctx.strokeStyle = 'hsl(0,0%,' + (1 - color.getLightness()) * 100 + '%)';
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
		
	function relocateColorPoint(mouseH: number, mouseL: number){
		let newColor = HLCoordsToColor(mouseH, mouseL);
		if(closestIsStart){
			allCues[closestIndex].start_color = newColor;
		} else {
			allCues[closestIndex].end_color = newColor;
		}
		transPickerRedrawLine(allCues[closestIndex]);
	}
//---
	
//Transition Picker event handlers
	function handleTransitionPickerMouseMove(e: MouseEvent){
		let rect = transitionPicker.getBoundingClientRect();
		let mouseH = e.clientX - rect.left;
		let mouseL = e.clientY - rect.top;
		relocateColorPoint(mouseH, mouseL);
	}

	function handleTransitionPickerMouseDown(e: MouseEvent){
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

	function handleTransitionPickerMouseUp(e: MouseEvent){
		//make cursor visible again
		transitionPicker.style.cursor = "crosshair";
		//add event handlers
		document.removeEventListener("mouseup", handleTransitionPickerMouseUp);
		document.removeEventListener("mousemove", handleTransitionPickerMouseMove);
	}
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
		allCues[currentCueID].ramp_parameter = parseInt(value);
		rampParameterDisplay.innerHTML = value;
	}
	function updateRampType(value: string){
		if(RampType[value] != undefined){
				allCues[currentCueID].ramp_type = RampType[value];
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
		transPickerRedrawLine(allCues[currentCueID]);
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
		channelEditStartButton.setAttribute("hidden", "");
		ledHitboxDiv.removeAttribute("hidden");
		channelEditStopButton.removeAttribute("hidden");
		editChannelsInstructions.removeAttribute("hidden");
	}

	function stopChannelEditing(){
		channelEditStartButton.removeAttribute("hidden");
		ledHitboxDiv.setAttribute("hidden", "");
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
			transPickerClearLine();
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
		transPickerRedrawLine(allCues[currentCueID]);
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
		let id = smallestUnusedID(allCues); 
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
//---

//Schedule management
	let currentScheduleID = NaN;
	let allSchedules: Schedule[] = [];

	function deletePeriods(index){
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

	function dropCueIntoSchedule(event){
		let cueID = event.dataTransfer.getData("cueID");
		if (event.dataTransfer.getData("task") === "copy"){
			addPeriod(cueID);
		}
	}

	function dragCue(elem, event){
		event.dataTransfer.setData("task", "copy");
		event.dataTransfer.setData("cueID", elem.getAttribute("cueID"));
	}

	function dragPeriod(elem, event){
		event.dataTransfer.setData("task", "reorder");
		event.dataTransfer.setData("cueID", elem.getAttribute("cueID"));
	}

	function createPeriod(id){
		let periodID = smallestUnusedID(allSchedules[currentScheduleID].periods);
		let template = document.getElementById("periodTemplate")!.cloneNode(true) as HTMLElement;
		template.removeAttribute("hidden");
		template.setAttribute("cueID", id);
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
			
			let mousemove = function(event){
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

	function addPeriod(id){
		createPeriod(id);
		let itemID = smallestUnusedID(allSchedules[currentScheduleID].periods);
		allSchedules[currentScheduleID].periods[itemID] = new Period(id);
	}

	function createSchedule(){
		let id = smallestUnusedID(allSchedules); 
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

	function openSchedule(index){
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

	function closeSchedule(index){
		index = defaultValue(index, currentScheduleID);
		let elem = scheduleBrowserItemByScheduleID(index);
		if (elem != null){
			elem.removeAttribute("active");
			transPickerClearLine();
			clearScheduleEditor();
			currentScheduleID = NaN;
		}
	}

	function deleteSchedule(index){
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

//Ring Display constants and drawing functions
	//measurements in mm
		let buttonR			= 4.9;
		let ringR			= 5.45;
		let ringWidth		= 0.9;
		let caseRInner		= 6;
		let caseREdge		= 6.75;
		let caseROuter		= 9;
	//---
	//above Radii are in mm, have to be scaled to pixels
	let canvasScale = 16;

	let ringX = ledRingCanvas.width/2;
	let ringY = ledRingCanvas.height/2;

	//draw complete case to canvas
	function drawCase(){
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
	}
	
	//Draw colour to one LED
	function drawLed(index: number, color: Color){
		color = defaultValue(color, Color('black'));
		index = index % numLeds;
		ledRingCtx.lineWidth = ringWidth * canvasScale;
		ledRingCtx.strokeStyle = color.toCSS();
		ledRingCtx.beginPath();
		ledRingCtx.arc(ringX, ringY, ringR * canvasScale, 
			(ledLastStartRad + ledsStepRad * index) * Math.PI, 
			(ledLastEndRad + ledsStepRad * index) * Math.PI
		);
		ledRingCtx.stroke();
	};

	//Generate and place Hitboxes for clicking LEDs
	function setupLedHitboxes(){
		let originalTemplate = document.getElementById("ledHitboxTemplate")!;
		let centerTop = (ledRingCanvas.height - originalTemplate.getBoundingClientRect().height)/2;
		let centerLeft = (ledRingCanvas.width - originalTemplate.getBoundingClientRect().width)/2;


		for(let id = 0; id < numLeds; id++){
			
			let template = document.getElementById("ledHitboxTemplate")!.cloneNode(true) as HTMLElement;
			template.removeAttribute("hidden");
			template.setAttribute("ledID", "" + id);
			template.removeAttribute("id");

			//calculate new position
			let angleDeg = -90 + id * (360 / numLeds);
			let angleRad = angleDeg * Math.PI / 180;
			let top = centerTop + Math.sin(angleRad) * ringR * canvasScale;
			let left = centerLeft + Math.cos(angleRad) * ringR * canvasScale;

			template.style.top = top + "px";
			template.style.left = left + "px";
			template.style.transform = "rotate(" + angleDeg + "deg)";

			template.addEventListener("click", function(){toggleChannel(id)});

			ledHitboxDiv.appendChild(template);
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

	function linear(start: number, end: number, wrapHue?: boolean){
		if (wrapHue == undefined) wrapHue = false;
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

	let result = Color();
	switch(ramp_type){
		case RampType.jump:
			if (progress > ramp_parameter){
				return end_color;
			} else {
				return start_color;
			}
		case RampType.linearHSL:
			return result
			.setHue(		linear(start_color.getHue(), 		end_color.getHue(), wrap_hue))
			.setSaturation(	linear(start_color.getSaturation(), end_color.getSaturation()))
			.setLightness(	linear(start_color.getLightness(), 	end_color.getLightness()));
		case RampType.linearRGB:
			return result
			.setRed(		linear(start_color.getRed(), 	end_color.getRed()))
			.setGreen(		linear(start_color.getGreen(), 	end_color.getGreen()))
			.setBlue(		linear(start_color.getBlue(), 	end_color.getBlue()));
	}
}

//Set up cues

drawCase();

//prepare cues
	createCue();

	createCue();
	allCues[1].duration = 3800;
	allCues[1].ramp_parameter = 0.38;
	allCues[1].time_divisor = 1;
	allCues[1].start_color = Color('hsl(8, 100%, 5%)');
	allCues[1].end_color = Color('hsl(84, 100%, 62%)');

	createCue();
	allCues[2].duration = 900;
	allCues[2].ramp_type = RampType.jump;
	allCues[2].ramp_parameter = 0.52;
	allCues[2].start_color = Color('#FAFF03');
	allCues[2].end_color = Color('#FF00E6');
	allCues[2].reverse = true;

	createCue();
	allCues[3].duration = 60000;
	allCues[3].ramp_type = RampType.jump;
	allCues[3].ramp_parameter = 0.1;
	allCues[3].start_color = Color('white');
	allCues[3].end_color = Color('black');

	createCue();
	allCues[4].duration = 3500;
	allCues[4].start_color = Color('hsl(121, 100%, 95%)');
	allCues[4].end_color = Color('hsl(307, 100%, 15%)');

	createCue();
	allCues[5].duration = 700;
	allCues[5].time_divisor = 6;
	allCues[5].ramp_parameter = 0.5;
	allCues[5].start_color = Color('hsl(272, 100%, 6%)');
	allCues[5].end_color = Color('hsl(184, 100%, 51%)');

	createCue();
	allCues[6].wrap_hue = true;
	allCues[6].start_color = Color('hsl(310, 100%, 50%)');
	allCues[6].end_color = Color('hsl(103, 100%, 95%)');

	// first time setup
	openCue(6);
	redrawTransitionPickerGradient();
//---

//draw test ring
for(let i = 1; i <= numLeds; i++){
	if(i === numLeds){
		drawLed(i, Color('green'));
	} else {
		drawLed(i, Color('grey'));
	}
}


function drawCue(id){
	if(id >= 0){
		let currentColor = Color('black');; 
		let cue = allCues[id];
		let duration = cue.duration;

		for(let i = numLeds - 1; i >= 0; i--){
			if(cue.channels[i]){
				currentColor = interpolate(cue, timeForLED(cue, currentTime, i)/duration);
				
			} else {
				currentColor = Color('black');
			}
			drawLed(i, currentColor);
		}

		//redraw dot for colour of topmost LED
		transPickerRedrawDot(currentColor);
		updateTime(allCues[currentCueID].duration);
	}
	else {
		//draw black onto the display if there's no cue to read from
		let currentColors = Array(numLeds).fill(Color('black'), 0, numLeds);
		for(let i = 0; i < numLeds; i++){
			drawLed(i, currentColors[i]);
		}
		transPickerRedrawDot(currentColors[0]);
	}
}

//*
//Main loop
	setupLedHitboxes();
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
let logged = false;
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

		if(logged){
			console.log(finalColors);
			logged = true;
		}
		

		for(let i in finalColors){
			drawLed(parseInt(i), finalColors[i]);
		}

		transPickerRedrawDot(finalColors[0]);
		updateTime(totalDur);
		updateProgressBarPosition();
	}
	else{
		drawCue(currentCueID);
	}
	
}, pollingInterval);
//*/
