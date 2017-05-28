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

		for(let i in schedule.periods){
			editor.periods.create(schedule.periods[i].cue_id);
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
                while((period = periodByCueID(cue_id)) !== null){
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
                if((period = periodByCueID(cue_id)) !== null){
                    periodList.removeChild(period);
                    updateProgressBarHeight();
                }
            }

            export function create(cue_id: number){
                let periodID = firstFreeIndex(all[currentID].periods);
                let template = document.getElementById("periodTemplate")!.cloneNode(true) as HTMLElement;
                template.removeAttribute("hidden");
                template.setAttribute("cueID", "" + cue_id);
                template.setAttribute("periodID", "" + periodID);
                template.removeAttribute("id");

                //Modify period noUiSlider
                let slider = template.getElementsByClassName("periodDelays")[0] as HTMLElement;
                slider.id = "periodSlider" + cue_id;
                noUiSlider.create(slider, {
                    start: current().duration,
                    connect: [true, false],
                    format: wNumb({decimals:0}),
                    tooltips: true,
                    behaviour: "tap-drag",
                    margin: 1,
                    step: 1,
                    range: {
                        'min': 0,
                        'max': 3000
                    }
                });

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

                //display fully prepared element
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
                let itemID = firstFreeIndex(all[currentID].periods);
                all[currentID].periods[itemID] = new Period(cue_id);
                times.reset();
            }

            export function addDelay(cue_id: number){
                let periodElem = periodByCueID(cue_id);
                if(periodElem == null){
                    console.warn(`Tried to access period with Cue ID ${cue_id}, but it didn't exist.`);
                    return;
                }

                //TODO: actually create new delay in period

                let slider = periodElem.getElementsByClassName("periodDelays")[0] as any;
                let options = slider.noUiSlider.options;
                let values = slider.noUiSlider.get() as string|string[]|number[];

                //don't add anything if there is a delay at the very end of the schedule
                if(
                    (typeof values == "string" && 
                    parseInt(values) == current().duration) ||
                    values.slice(-1)[0] == current().duration)
                {
                    return;
                }

                slider.noUiSlider.destroy();

                if(typeof values == "string"){
                    values = [values]
                }

                options.start = values;
                options.start.push(current().duration);
                //always be opposite kind of previous delay
                options.connect.push(!options.connect.slice(-1)[0]);
                noUiSlider.create(slider, options);
            }

            export function removeDelay(cue_id: number){
                let periodElem = periodByCueID(cue_id);
                if(periodElem == null){
                    console.warn(`Tried to access period with Cue ID ${cue_id}, but it didn't exist.`);
                    return;
                }

                //TODO: actually create new delay in period

                let slider = periodElem.getElementsByClassName("periodDelays")[0] as any;
                let options = slider.noUiSlider.options;
                let values = slider.noUiSlider.get() as string|string[]|number[];

                //don't do anythign if there's just a single value left
                if(typeof values == "string"){
                    return;
                }

                slider.noUiSlider.destroy();

                options.start = values;
                options.start.pop();
                options.connect.pop();

                noUiSlider.create(slider, options);
            }

            export function updateRange(oldDuration: number, newDuration: number){
                let periods = periodList.getElementsByClassName("period");
                for(let period of periods){
                    let slider = period.getElementsByClassName("periodDelays")[0] as any;
                    let oldValues = slider.noUiSlider.get() as string[];
                    let newValues: number[] = [];
                    for(let i in oldValues){
                        newValues[i] = parseInt(oldValues[i]) * (newDuration/oldDuration);
                    }

                    slider.noUiSlider.updateOptions({
                        start: newValues,
                        range:{'min':0, 'max':newDuration}
                    });
                }
            }
        }

        export function periodByCueID(id: number){
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