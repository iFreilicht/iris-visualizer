/// <reference path="./schedule.ts"/>
/// <reference path="./noUiSlider/distribute/nouislider.js"/>
/// <reference path="./wnumb/wNumb.js"/>

declare var noUiSlider: any;
declare var wNumb: any;

namespace schedules{
    let currentID = NaN;
    //TODO: don't export this! This is only exported for uploadJSON and downloadJSON!
    export let all: Schedule[] = [];



    export function current(){
        return get(currentID);
    }

    export function hasCurrent(){
        return all[currentID] != undefined;
    }
    

    export function get(id: number){
        if(all[id] == undefined){
            throw new RangeError(`Tried to access Cue with ID ${currentID}, but it doesn't exist.`);
        }
        return all[id];
    }

    export function length(){
        return all.length;
    }

    export function open(id: number){
        cues.closeCurrent();
		closeCurrent();
		editor.unhide();

		currentID = id;
		let schedule = get(id);

		browser.activate(id);
        editor.duration.update(schedule);

		for(let period of schedule.periods){
            if(period != null){
                editor.periods.create(period.cue_id);
            }
		}

		times.reset();
    }

    export function close(id: number){
		browser.deactivate(id);
        clearLine();
        clearDot();
        editor.clear();
        currentID = NaN;
    } 

    export function closeCurrent(){
        if(hasCurrent()){
            close(currentID);
        }
    }

    export function clear(){
        for (let i = length() - 1; i >= 0; i--){
            destroy(i);
        }
    }

    export function create(id?: number){
        if (id == null){
            id = firstFreeIndex(all); 
        }

        //create Schedule object
        if(all[id] == null){
            let schedule = new Schedule(undefined);
		    all[id] = schedule;
        }

        browser.addItem(id);

		open(id);
    }

    export function destroy(id: number){
        if (length() <= 0){
			return;
		}
		if (currentID == id){
			closeCurrent();
		}
		
        if(all[id] != null){
            browser.removeItem(id);

            delete all[id];
        }
		
		currentID = NaN;
    }

    export namespace browser{
        let mainDiv = document.getElementById("scheduleBrowser")!;


        function itemByScheduleID(id: number){
            return document.querySelector('.schedule[scheduleID="' + id + '"]');
        }

        export function addItem(id: number){
            let template = document.getElementById("scheduleTemplate")!.cloneNode(true) as Element;
            template.removeAttribute("hidden");
            template.setAttribute("scheduleID", "" + id);
            template.removeAttribute("id");
            
            //Modify openCue button from template
            let openScheduleButton = template.getElementsByClassName("openSchedule")[0] as HTMLInputElement;
            openScheduleButton.value = "Schedule " + id;
            openScheduleButton.addEventListener("click", function(){open(id)});
            
            //Modify deleteCue button from template
            let deleteScheduleButton = template.getElementsByClassName("deleteSchedule")[0];
            deleteScheduleButton.addEventListener("click", function(){destroy(id)});

            //display fully prepared element
            mainDiv.appendChild(template);
        }

        export function removeItem(id: number){
            let scheduleElement = itemByScheduleID(id);
            if(scheduleElement instanceof Element){
                mainDiv.removeChild(scheduleElement);       
            } else {
                console.warn(`Tried to delete schedule at index ${id}, but it didn't exist.`);
            }
        }

        export function activate(id: number){
            let elem = itemByScheduleID(id);
            if(elem instanceof Element){
                elem.setAttribute("active", "");
            } else {
                console.warn(`Tried to open schedule at index ${id}, but it didn't exist.`);
            }
        }

        export function deactivate(id: number){
            let elem = itemByScheduleID(id);
            if (elem instanceof Element){
                elem.removeAttribute("active");
            } else {
                console.warn(`Tried to close schedule at index ${id}, but it didn't exist.`);
            }
        }

        export function init(){
            document.getElementById("createScheduleButton")!.addEventListener("click", function(){create()});
        }
    }

    export namespace editor{
        let mainDiv = document.getElementById("scheduleEditorDiv")!;
        let periodList = document.getElementById("scheduleEditor")!;
        let progressBar = document.getElementById("scheduleProgressBar")!;

        export namespace duration{
            let input = document.getElementById("scheduleEditorTimescale") as HTMLInputElement;
            export function update(schedule: Schedule){
                input.value = schedule.duration.toString();
            }

            function handleInput(value: string){
                let newDur = parseInt(value)
                if(!(newDur > 0)){
                    return;
                }

                let oldDur = current().duration;
                current().duration = newDur;
                periods.updateRange(oldDur, newDur);
            }

            export function init(){
                input.addEventListener("input", function(){ handleInput(this.value) });
            }
        }

        export namespace periods{
            export function removeFromAll(cue_id: number){
                let period: Element | null; 
                while((period = periodElementByCueID(cue_id)) !== null){
                    periodList.removeChild(period);
                }

                for(let i in all){
                    for(let j in all[i].periods){
                        if(all[i].periods[j].cue_id == cue_id){
                            delete all[i].periods[j];
                        }
                    }
                }
            }

            export function remove(cue_id: number){
                let periods = current().periods;
                for(let i in periods){
                    if(periods[i].cue_id == cue_id){
                        delete periods[i];
                    }
                }
                let period: Element | null;
                if((period = periodElementByCueID(cue_id)) !== null){
                    periodList.removeChild(period);
                    updateProgressBarHeight();
                }
            }

            export function create(cue_id: number){
                let template = document.getElementById("periodTemplate")!.cloneNode(true) as HTMLElement;
                template.removeAttribute("hidden");
                template.setAttribute("cueID", "" + cue_id);
                template.removeAttribute("id");

                //Modify period noUiSlider
                let slider = template.getElementsByClassName("periodDelays")[0] as HTMLElement;
                let options = {
                    start: current().duration,
                    connect: [true, false],
                    format: wNumb({decimals:0}),
                    tooltips: true,
                    behaviour: "tap-drag",
                    margin: 1,
                    step: 1,
                    range: {
                        'min': 0,
                        'max': current().duration
                    }
                }

                slider.id = "periodSlider" + cue_id;
                createSlider(slider, cue_id, options);

                //Modify name from template
                let periodName = template.getElementsByClassName("periodName")[0] as HTMLLabelElement;
                periodName.htmlFor = slider.id;
                periodName.innerText = cues.get(cue_id).name;
                periodName.addEventListener("click", function(){/*openCueItem(template)*/});

                let removePeriodButton = template.getElementsByClassName("removePeriodButton")[0]!;
                removePeriodButton.addEventListener("click", function(){ periods.remove(cue_id); })

                let addDelayButton = template.getElementsByClassName("addDelayButton")[0]!;
                addDelayButton.addEventListener("click", function(){ periods.addDelay(cue_id); })

                let removeDelayButton = template.getElementsByClassName("removeDelayButton")[0]!;
                removeDelayButton.addEventListener("click", function(){ periods.removeDelay(cue_id); })

                //display prepared element
                periodList.appendChild(template);
                updateProgressBarHeight();
            }

            export function add(cue_id: number){
                //check if period for cue id already exists
                for(let period of current().periods){
                    if(period != null && period.cue_id == cue_id){
                        return;
                    }
                }

                create(cue_id);
                current().addPeriod(cue_id);
                times.reset();
            }

            export function addDelay(cue_id: number, delay?: number){
                let periodElem = periodElementByCueID(cue_id);
                let period = current().period(cue_id);
                if(periodElem == null || period == null){
                    console.warn(`Tried to access period with Cue ID ${cue_id}, but it didn't exist.`);
                    return;
                }

                let slider = periodElem.getElementsByClassName("periodDelays")[0]!;
                let options = (slider as any).noUiSlider.options;
                let values =  (slider as any).noUiSlider.get() as string | string[] | number[];

                if((typeof values == "string" && 
                    parseInt(values) == current().duration))
                {
                    let handle = slider.getElementsByClassName("noUi-handle")[0]!;
                    //don't add anything if there is a visible delay at the very end of the schedule
                    if(period.delays.length >= 1){
                        return;
                    }
                    //if there's no delay currently displayed, re-spawn slider
                    //to unhide the last handle and re-add the event listeners
                    else{
                        destroySlider(slider);

                        period.delays.push(defaultValue(delay, current().duration));

                        options.start = current().duration;
                        createSlider(slider, cue_id, options);
                    }
                }
                //don't add anything if there is a delay at the very end of the schedule
                else if(values.slice(-1)[0] == current().duration)
                {
                    return;
                }
                //otherwise, re-spawn the slider with one added handle
                else {
                    destroySlider(slider);

                    if(typeof values == "string"){
                        values = [values]
                    }

                    period.delays.push(current().duration);

                    options.start = values;
                    options.start.push(current().duration);
                    //always be opposite kind of previous delay
                    options.connect.push(!options.connect.slice(-1)[0]);
                    createSlider(slider, cue_id, options);
                }
            }

            export function removeDelay(cue_id: number){
                let periodElem = periodElementByCueID(cue_id);
                let period = current().period(cue_id);
                if(periodElem == null || period == null){
                    console.warn(`Tried to access period with Cue ID ${cue_id}, but it didn't exist.`);
                    return;
                }

                period.delays.pop(); //popping doesn't fail on an empty array, no need to check anything

                let slider = periodElem.getElementsByClassName("periodDelays")[0]!;
                let options = (slider as any).noUiSlider.options;
                let values = (slider as any).noUiSlider.get() as string|string[]|number[];

                destroySlider(slider);

                //hide slider handle if there's just one value left
                if(typeof values == "string"){
                    options.start = "" + current().duration;
                } 
                //otherwise, remove the last slider handle
                else {
                    options.start = values; //make sure values are retained
                    options.start.pop();
                    options.connect.pop()
                    
                }

                createSlider(slider, cue_id, options);
            }

            export function updateRange(oldDuration: number, newDuration: number){
                let periods = periodList.getElementsByClassName("period");
                for(let period of periods){
                    let slider = period.getElementsByClassName("periodDelays")[0] as any;
                    let oldValues = slider.noUiSlider.get() as string | string[];
                    let newValues: number[] = [];

                    if(typeof oldValues == "string"){
                        oldValues = [oldValues];
                    }
                    for(let i in oldValues){
                        newValues[i] = parseInt(oldValues[i]) * (newDuration/oldDuration);
                    }

                    slider.noUiSlider.updateOptions({
                        start: newValues,
                        range:{'min':0, 'max':newDuration}
                    });
                }
            }

            function createSlider(target: Element, cue_id: number, options: any){
                let period = current().period(cue_id);

                if(period != null){
                    let delays = period.delays;
                    //insert values if necessary
                    if(delays.length > 0){
                        options.start = [];
                        options.connect = [true];
                        for(let delay of delays){
                            options.start.push(delay);
                            //always be opposite kind of previous delay
                            options.connect.push(!options.connect.slice(-1)[0]);
                        }
                    }
                }

                noUiSlider.create(target, options);

                if(period == null || period.delays.length == 0){
                    //clone node and replace it to clear all event listeners (https://stackoverflow.com/a/19470348/2533467) 
                    let base = target.getElementsByClassName("noUi-base")[0]!;
                    let baseClone = base.cloneNode(true);
                    base.parentNode!.replaceChild(baseClone, base);

                    //hide the slider handle
                    let handle = target.getElementsByClassName("noUi-handle")[0]!;
                    handle.setAttribute("hidden", "");
                }

                (target as any).noUiSlider.on('update', function(){
                    handleInput(cue_id, (target as any).noUiSlider.get());
                });
            }

            function destroySlider(target: Element){
                (target as any).noUiSlider.destroy();
            }

            function handleInput(cue_id: number, values: string | string[]){
                let period = current().period(cue_id);

                if(period == null){
                    return;
                }

                if(typeof values == "string"){
                    values = [values];
                }

                for(let i in period.delays){
                    period.delays[i] = parseInt(values[i]);
                }
            }
        }

        export function periodElementByCueID(id: number){
            return document.querySelector('.period[cueID="' + id + '"]');
        }

        export function hide(){
            mainDiv.setAttribute("hidden", "");
		    progressBar.setAttribute("hidden", "");
        }

        export function unhide(){
            cues.editor.hide();
            mainDiv.removeAttribute("hidden");
		    progressBar.removeAttribute("hidden");
        }

        export function clear(){
            for(let i = periodList.children.length; i > 0; i--){
                periodList.removeChild(periodList.children[0]);
            }
        }

        function updateProgressBarHeight(){
		    progressBar.style.height = periodList.getBoundingClientRect().height + "px";
	    }

        export function updateProgressBarPosition(){
            let periodElem =  periodList.children[0];
            if(periodElem == null){
                return;
            }

            let slider = periodElem.getElementsByClassName("periodDelays")[0]!;

            let boundingRect = slider.getBoundingClientRect();
            let baseline = boundingRect.left;
            let rightmost = slider.getBoundingClientRect().right - baseline;

            let progress = times.current() / current().duration;
            progressBar.style.left = baseline + progress * rightmost + "px";
        }

        export function init(){
            duration.init();
        }
    }

    export function init(){
        browser.init();
        editor.init();
    }
}