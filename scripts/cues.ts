/// <reference path="./cue.ts"/>

namespace cues{
    let currentID = NaN;
    //TODO: don't export this! This is only exported for uploadJSON and downloadJSON!
    export let all: Cue[] = [];

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
        closeCurrent();
		schedules.closeCurrent();
		editor.unhide();

		currentID = id;
		let cueItem = browser.itemByCueID(id);
		if (cueItem instanceof Element){
			cueItem.setAttribute("active", "");
		} else {
			console.warn(`Tried to open cue with index ${id}, but it didn't exist.`)
		}
		//TODO: Update all the values displayed in editor
		redrawLine(cues.current());
		updateCueEditorValues(cues.current());
		times.reset();
    }

    export function close(id: number){
        //currentCueID is NOT set to NaN here! Keep it this way! 
		//Better render a few false frames than let the display die
		let elem = browser.itemByCueID(id);
		if (elem != null){
			stopChannelEditing();
			elem.removeAttribute("active");
			clearLine();
			clearDot();
			currentID = NaN;
		}
    }

    //will always succeed, even if currentID is not set
    export function closeCurrent(){
        if(hasCurrent()){
            close(currentID);
        }
    }

    export function create(){
        let id = firstFreeIndex(all); 
        browser.addItem(id);

		//create cue object
		let cue = new Cue();
		all[id] = cue;
		
		open(id);
    }

    export function destroy(id: number){
        if (cues.length() <= 0){
			return;
		}
		if (currentID == id){
			close(id);
		}
		
		browser.removeItem(id);
		
		schedules.editor.removePeriods(id);
		delete all[id];
    }

    namespace browser{
        let mainDiv = document.getElementById("cueBrowser")!;

        export function itemByCueID(id: number){
            return document.querySelector('.cueItem[cueID="' + id + '"]');
        }

        export function addItem(id: number){
            let template = document.getElementById("cueTemplate")!.cloneNode(true) as Element;
            template.removeAttribute("hidden");
            template.setAttribute("cueID", "" + id);
            template.removeAttribute("id");
            
            //Modify openCue button from template
            let openCueButton = template.getElementsByClassName("openCue")[0] as HTMLInputElement;
            openCueButton.value = "Cue " + id;
            openCueButton.addEventListener("click", function(){open(id)});
            
            //Modify deleteCue button from template
            let deleteCueButton = template.getElementsByClassName("deleteCue")[0] as HTMLInputElement;
            deleteCueButton.addEventListener("click", function(){destroy(id)});
            
            //display fully prepared element
            mainDiv.appendChild(template);
        }

        export function removeItem(id: number){
            let cueItem = itemByCueID(id);
            if (cueItem instanceof Element){
                mainDiv.removeChild(cueItem);
            } else {
                console.warn(`Tried to remove cue with index ${id}, but it didn't exist.`)
            }
        }
    }

    export namespace editor{
        let mainDiv = document.getElementById("cueEditor")!;

        export function hide(){
            mainDiv.setAttribute("hidden", "");
        }

        export function unhide(){
            schedules.editor.hide();
            mainDiv.removeAttribute("hidden");
        }
    }
}