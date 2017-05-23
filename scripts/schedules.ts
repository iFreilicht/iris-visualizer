/// <reference path="./schedule.ts"/>

namespace schedules{
    let currentID = NaN;
    let all: Schedule[] = [];



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

		for(let i in schedule.periods){
			editor.createPeriod(schedule.periods[i].cue_id);
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

    export function create(){
        let id = firstFreeIndex(all); 
        browser.addItem(id);
		
		//create Schedule object
		let schedule = new Schedule(undefined);
		all[id] = schedule;
		
		open(id);
    }

    export function destroy(id: number){
        if (length() <= 0){
			return;
		}
		if (currentID == id){
			closeCurrent();
		}
		
		browser.removeItem(id);

		delete all[id];
		
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
            document.getElementById("createScheduleButton")!.addEventListener("click", create);
        }
    }

    export namespace editor{
        let mainDiv = document.getElementById("scheduleEditorDiv")!;
        let periodList = document.getElementById("scheduleEditor")!;
        let progressBar = document.getElementById("scheduleProgressBar")!;

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
            let baseline = periodList.getBoundingClientRect().left;
            let rightmost = 0;
            for(let i = periodList.children.length - 1; i >= 0; i--){
                let listItem = periodList.children.item(i);
                let right = listItem.getBoundingClientRect().right - baseline;
                if(right > rightmost){
                    rightmost = right;
                }
            }

            let progress = times.current() / current().totalDuration();
            progressBar.style.left = baseline + progress * rightmost + "px";
        }

        export function removePeriods(cue_id: number){
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

        export function createPeriod(cue_id: number){
            let periodID = firstFreeIndex(all[currentID].periods);
            let template = document.getElementById("periodTemplate")!.cloneNode(true) as HTMLElement;
            template.removeAttribute("hidden");
            template.setAttribute("cueID", "" + cue_id);
            template.setAttribute("periodID", "" + periodID);
            template.removeAttribute("id");

            //Modify openCue button from template
            let openCueButton = template.getElementsByClassName("openCue")[0] as HTMLInputElement;
            openCueButton.value = "Cue " + cue_id;
            openCueButton.addEventListener("click", function(){/*openCueItem(template)*/});
            
            //implement dragging
            template.addEventListener("mousedown", function(event : MouseEvent){
                let leftLower = periodList.getBoundingClientRect().left + event.offsetX;
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
            periodList.appendChild(template);
            updateProgressBarHeight();
        }

        export function addPeriod(cue_id: number){
            createPeriod(cue_id);
            let itemID = firstFreeIndex(all[currentID].periods);
            all[currentID].periods[itemID] = new Period(cue_id);
            times.reset();
        }
    }

    export function init(){
        browser.init();
    }
}