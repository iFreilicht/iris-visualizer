/// <reference path="./helpers/defaultValue.ts"/>
/// <reference path="./helpers/firstFreeIndex.ts"/>
/// <reference path="./cue.ts"/>
/// <reference path="./ringDisplay.ts"/>
/// <reference path="./transitionPicker.ts"/>
/// <reference path="./cues.ts"/>
/// <reference path="./schedules.ts"/>
/// <reference path="./times.ts"/>
/// <reference path="../resources/example_cues.ts"/>

import drawLed 		= ringDisplay.drawLed;
import redrawLine 	= transitionPicker.line.redraw;
import redrawDot 	= transitionPicker.dot.redraw;
import clearLine	= transitionPicker.line.clear;
import clearDot 	= transitionPicker.dot.clear;

function init(){
	ringDisplay.init();
	transitionPicker.init();
	cues.init();
	schedules.init();

	loadJSON(example_cues);
}

//"use strict";
 
//constants
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

//Timings
//---

//get document elements
	let output = document.getElementById("output")!;

	let uploadAnchor = document.getElementById("uploadAnchor") as HTMLInputElement;
	//store empty file list now as it cannot be constructed later
	let emptyFileList = uploadAnchor.files!;
//---

//editor options objects
//---

//encapsulating divs	
//---

//Additional Options Collapsible
//---

//Event Handlers for options:
//---

//Cue Management

	class JSONStorage{
		cues: typeof cues.all;
		schedules: typeof schedules.all;

		constructor(all_cues: typeof cues.all, all_schedules: typeof schedules.all){
			this.cues = all_cues;
			this.schedules = all_schedules;
		}
	}

	function downloadJSON(){
		let dataStr = "data:text/json;charset=utf-8," 
					+ encodeURIComponent(JSON.stringify(
						new JSONStorage(cues.all, schedules.all),
						null, 
						2
					));

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
		
		reader.onload = function(){
			let data: string = reader.result;
			loadJSON(data);
		}
		
		reader.readAsText(file);
	}

	function loadJSON(data: string){
		let loadedObj = null;

		function isPeriod(v: any): v is Period{
			return v.hasOwnProperty('cue_id') && v.hasOwnProperty('delays');
		}

		function isJSONStorage(v: any): v is JSONStorage{
			return v.hasOwnProperty('cues') && v.hasOwnProperty('schedules');
		}

		try {
			loadedObj = JSON.parse(data, 
			function(key: string, value: Object | null){
				if(value == null){
					return null;
				}
				//this check is enough because the Cue constructor is very permissive
				if(value.hasOwnProperty('start_color')){
					//revive cues
					return new Cue(value as CueSerialized);
				}
				if(value.hasOwnProperty('periods')){
					return new Schedule(value);
				}
				if(isPeriod(value)){
					return new Period(value.cue_id, value.delays);
				}
				return value;
			});

			if (!isJSONStorage(loadedObj)){
				throw TypeError("Loaded file was not recognised as a cue or schedule list.");
			}
			
			cues.clear();
			schedules.clear();

			let loadedCues = loadedObj.cues;
			let loadedSchedules = loadedObj.schedules;
			
			//add newly loaded Cues
			for (let i in loadedCues){
				if(!isNaN(parseInt(i)) && loadedCues[i] != null){
					(cues.all as any)[i] = loadedCues[i];
					cues.create(parseInt(i));
				}
			}

			//add newly loaded Schedules
			for (let i in loadedSchedules){
				if(!isNaN(parseInt(i))){
					(schedules.all as any)[i] = loadedSchedules[i];	
					schedules.create(parseInt(i));
				}
			}
			
			cues.open(0);			
		}
		catch (e){
			alert("Sorry, the file you supplied could not be read properly. "
					+"More info can be found in the console log. (F12)")
			console.log("Loaded Object:", loadedObj);
			throw e;
		}
	}
//---

//Schedule management
	function dropCueIntoSchedule(event: DragEvent){
		let cueID = event.dataTransfer.getData("cueID");
		if (event.dataTransfer.getData("task") === "copy"){
			schedules.editor.periods.add(parseInt(cueID));
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
//---

init();
window.setInterval(function () {
	if(schedules.hasCurrent()){
		ringDisplay.drawSchedule(schedules.current());
	}
	else{
		if(cues.hasCurrent()){
			ringDisplay.drawCue(cues.current());
		}
		else{
			ringDisplay.drawColor(new Color('black'));
		}
	}
}, times.pollingInterval);
//*/
