/// <reference path="./helpers/defaultValue.ts"/>
/// <reference path="./helpers/firstFreeIndex.ts"/>
/// <reference path="./cue.ts"/>
/// <reference path="./ringDisplay.ts"/>
/// <reference path="./transitionPicker.ts"/>
/// <reference path="./cues.ts"/>
/// <reference path="./schedules.ts"/>
/// <reference path="./times.ts"/>

import drawLed 		= ringDisplay.drawLed;
import redrawLine 	= transitionPicker.line.redraw;
import redrawDot 	= transitionPicker.dot.redraw;
import clearLine	= transitionPicker.line.clear;
import clearDot 	= transitionPicker.dot.clear;

function init(){
	ringDisplay.init();
	transitionPicker.init();
	cues.init();
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

	function downloadJSON(){
		let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cues.all, null, 2));
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
				for (let i = cues.length(); i > 0; i--){
					cues.destroy(0);
				}
				
				//add newly loaded Cues
				for (let i in loadedCues){
					cues.create();
					(cues.all as any)[i] = loadedCues[i];
				}
				
				cues.open(0);			
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
	function dropCueIntoSchedule(event: DragEvent){
		let cueID = event.dataTransfer.getData("cueID");
		if (event.dataTransfer.getData("task") === "copy"){
			schedules.editor.addPeriod(parseInt(cueID));
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

//prepare cues
	cues.create();
	cues.get(0).name = "Rainbow";

	cues.create();
	cues.get(1).name = "Breathing";
	cues.get(1).duration = 3800;
	cues.get(1).ramp_parameter = 0.38;
	cues.get(1).time_divisor = 1;
	cues.get(1).start_color = new Color('hsl(8, 100%, 5%)');
	cues.get(1).end_color = new Color('hsl(84, 100%, 62%)');

	cues.create();
	cues.get(2).name = "Simple Jump";
	cues.get(2).duration = 900;
	cues.get(2).ramp_type = RampType.jump;
	cues.get(2).ramp_parameter = 0.5;
	cues.get(2).start_color = new Color('#FAFF03');
	cues.get(2).end_color = new Color('#FF00E6');
	cues.get(2).reverse = true;

	cues.create();
	cues.get(3).name = "Clock 1m";
	cues.get(3).duration = 60000;
	cues.get(3).ramp_type = RampType.jump;
	cues.get(3).ramp_parameter = 0.08;
	cues.get(3).start_color = new Color('white');
	cues.get(3).end_color = new Color('black');

	cues.create();
	cues.get(4).name = "Borealis";
	cues.get(4).duration = 3500;
	cues.get(4).start_color = new Color('hsl(121, 100%, 95%)');
	cues.get(4).end_color = new Color('hsl(307, 100%, 15%)');

	cues.create();
	cues.get(5).name = "Double Blue";
	cues.get(5).duration = 700;
	cues.get(5).time_divisor = 6;
	cues.get(5).ramp_parameter = 0.5;
	cues.get(5).start_color = new Color('hsl(272, 100%, 6%)');
	cues.get(5).end_color = new Color('hsl(184, 100%, 51%)');

	cues.create();
	cues.get(6).name = "Wrap Pink";
	cues.get(6).wrap_hue = true;
	cues.get(6).start_color = new Color('hsl(310, 100%, 50%)');
	cues.get(6).end_color = new Color('hsl(103, 100%, 95%)');

	// first time setup
	cues.open(6);
//---

//*
//Main loop
//TODO: Remove this!
	cues.create();
	cues.get(7).name = "MirrorbowR";
	cues.get(7).channels = [true, true, true, true, true, true, false, false, false, false, false, false];

	cues.create();
	cues.get(8).name = "MirrorbowL";
	cues.get(8).reverse = true;
	cues.get(8).channels = [false, false, false, false, false, false, true, true, true, true, true, true];

	schedules.create();
	schedules.get(0).periods = [new Period(8), new Period(7)];
	
	schedules.open(0);
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
