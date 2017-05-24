/// <reference path="./cue.ts"/>
/// <reference path="./helpers/assertNever.ts" />

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
		cues.editor.update(cues.current());
		times.reset();
    }

    export function close(id: number){
        //currentCueID is NOT set to NaN here! Keep it this way! 
		//Better render a few false frames than let the display die
		let elem = browser.itemByCueID(id);
		if (elem != null){
			cues.editor.channels.stopEditing();
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

    export function init(){
        for(let id in all){
            browser.updateName(parseInt(id));
        }

        editor.init();

        document.getElementById("createCueButton")!.addEventListener("click", create);
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
                console.warn(`Tried to access cue editor item with index ${id}, but it didn't exist.`)
            }
        }

        export function updateName(id: number){
            let cueItem = itemByCueID(id);
            if (cueItem instanceof Element){
                let openCueButton = cueItem.getElementsByClassName("openCue")[0] as HTMLInputElement;
                openCueButton.value = get(id).name; 
            } else {
                console.warn(`Tried to access cue editor item with index ${id}, but it didn't exist.`)
            }
        }
    }

    export namespace editor{
        let mainDiv = document.getElementById("cueEditor")!;

        export namespace name{
            let input = document.getElementById("name") as HTMLInputElement;
            export function update(cue: Cue){
                input.value = cue.name;
            }

            function handleInput(value: string){
                current().name = value;
                browser.updateName(currentID);
            }

            export function init(){
                input.addEventListener("input", function(){ handleInput(this.value) });
            }
        }
        export namespace channels{
            let instructions = document.getElementById("editChannelsInstructions")!;
            let startButton = document.getElementById("channelEditStartButton")!;
            let stopButton = document.getElementById("channelEditStopButton")!;

            export function startEditing(){
                ringDisplay.startChannelEditing();
                startButton.setAttribute("hidden", "");
                stopButton.removeAttribute("hidden");
                instructions.removeAttribute("hidden");
            }

            export function stopEditing(){
                ringDisplay.stopChannelEditing();
                startButton.removeAttribute("hidden");
                stopButton.setAttribute("hidden", "");
                instructions.setAttribute("hidden", "");
            }

            export function toggle(ledID: number){
                current().channels[ledID] = !current().channels[ledID];
            }

            export function init(){
                startButton.addEventListener("click", startEditing );
                stopButton.addEventListener("click", stopEditing );
            }
        }
        export namespace duration{
            let input =  document.getElementById("duration") as HTMLInputElement;

            export function update(cue: Cue){
                input.value = cue.duration.toString();
            }

            function handleInput(value: string){
                cues.current().duration = parseInt(value);
            }

            export function init(){
                input.addEventListener("input", function(){ handleInput(this.value) });
            }
        }
        export namespace time_divisor{
            let input = document.getElementById("timeDivisor") as HTMLInputElement;

            export function update(cue: Cue){
                input.value = cue.time_divisor.toString();
            }

            function handleInput(value: string){
                cues.current().time_divisor = parseInt(value);
            }

            export function init(){
                input.addEventListener("input", function(){ handleInput(this.value) });
            }
        } 
        export namespace ramp_type{
            let input = document.getElementById("rampType") as HTMLSelectElement;

            export function update(cue: Cue){
                input.value = (RampType as any)[cue.ramp_type];
                updateOptionVisibility(cues.current());
            }

            function handleInput(value: string){
                //No need to check whether the string actually contains a valid RampType
                //as this function is only called from the eventListener
                cues.current().ramp_type = (RampType as any)[value];
                updateOptionVisibility(cues.current());
            }

            export function init(){
                //populate selectElement programmatically
                for(let val in RampType){
                    //only apply to string values, not numbers
                    if(isNaN(parseInt(val))){
                        let optElem = document.createElement("option");
                        optElem.value = val;

                        //Modify display value: Make first letter uppercase, insert space before capital letters
                        let disp = val[0].toUpperCase() + val.slice(1);
                        disp = disp.replace(/([A-Z]+)/g, ' $1');
                        optElem.innerHTML = disp;

                        input.appendChild(optElem);
                    }
                }
                
                input.addEventListener("change", function(){ handleInput(this.value) });
            }
        }
        export namespace ramp_parameter{
            let mainDiv = document.getElementById("rampParameterDiv")!;
            let input = document.getElementById("rampParameter") as HTMLInputElement;
            let output = document.getElementById("rampParameterDisplay") as HTMLCanvasElement;

            export function update(cue: Cue){
                input.value = cue.ramp_parameter.toString(); 
                output.innerHTML = cue.ramp_parameter.toString();
            }


            function handleInput(value: string){
                cues.current().ramp_parameter = parseFloat(value);
                output.innerHTML = value;
            }

            export function init(){
                input.addEventListener("input", function(){ handleInput(this.value) });
            }

            export function hide(){
                mainDiv.setAttribute("hidden", "");
            }

            export function unhide(){
                mainDiv.removeAttribute("hidden");
            }
        }
        export namespace reverse{
            let input = document.getElementById("reverse") as HTMLInputElement;

            export function update(cue: Cue){
                input.checked = cue.reverse;
            }

            function handleInput(checked: boolean){
                cues.current().reverse = checked;
            }

            export function init(){
                input.addEventListener("change", function(){ handleInput(this.checked) });
            }
        }
        export namespace wrap_hue{
            let mainDiv = document.getElementById("wrapHueDiv")!;
            let input = document.getElementById("wrapHue") as HTMLInputElement;

            export function update(cue: Cue){
                input.checked = cue.wrap_hue;
            }

            function handleInput(checked: boolean){
                cues.current().wrap_hue = checked;
                transitionPicker.line.redraw(cues.current());
            }

            export function init(){
                 input.addEventListener("change", function(){ handleInput(this.checked) });
            }

            export function hide(){
                mainDiv.setAttribute("hidden", "");
            }

            export function unhide(){
                mainDiv.removeAttribute("hidden");
            }
        }

        export namespace additionalOptions{
            let mainDiv = document.getElementById("additionalOptionsDiv")!;
            let hidableDiv = document.getElementById("additionalOptions")!;
            let button = document.getElementById("additionalOptionsButton")!;

            export function toggle(){
                if(hidableDiv.hidden){
                    hidableDiv.removeAttribute("hidden");
                }
                else{
                    hidableDiv.setAttribute("hidden", "");
                }
            }

            export function init(){
                button.addEventListener("click", toggle);
            }
        }

        export function init(){
            name.init();
            duration.init();
            time_divisor.init();
            ramp_type.init();
            ramp_parameter.init();
            reverse.init();
            wrap_hue.init();
            channels.init();
            additionalOptions.init();
        }

        export function update(cue: Cue){
            name.update(cue);
            duration.update(cue);
            time_divisor.update(cue);
            ramp_type.update(cue);
            ramp_parameter.update(cue);
            reverse.update(cue);
            wrap_hue.update(cue);
        }

        function updateOptionVisibility(cue: Cue){
            switch(cue.ramp_type){
                case RampType.jump:
                    ramp_parameter.unhide();
                    wrap_hue.hide();
                    return;
                case RampType.linearHSL:
                    ramp_parameter.unhide();
                    wrap_hue.unhide();
                    return;
                case RampType.linearRGB:
                    ramp_parameter.unhide();
                    wrap_hue.hide();
                    return;
                default:
                    assertNever(cue.ramp_type);
            }


        }

        export function hide(){
            mainDiv.setAttribute("hidden", "");
        }

        export function unhide(){
            schedules.editor.hide();
            mainDiv.removeAttribute("hidden");
        }
    }
}