
namespace ringDisplay{
    let mainDiv = document.getElementById("ringDisplay")!;
    let hitboxes = document.getElementById("ledHitboxDiv")!;
    let canvas = document.getElementById("ledRingCanvas") as HTMLCanvasElement;
    let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

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

    let ringX = canvas.width/2;
    let ringY = canvas.height/2;

    //draw complete case to canvas
    function drawCase(){
        //draw static parts to canvas
        function drawCasePart(radius: number, color: Color){
            ctx.fillStyle = color.getHex();
            ctx.beginPath();
            ctx.arc(ringX, ringY, radius * canvasScale, 0, 2 * Math.PI);
            ctx.fill();
        }
        drawCasePart(caseROuter, caseColorOuter);
        drawCasePart(caseREdge, caseColorEdge);
        drawCasePart(caseRInner, caseColorInner);
        drawCasePart(buttonR, buttonColor);
    }

    //Generate and place Hitboxes for clicking LEDs
    function setupLedHitboxes(){
        //clear out all hitboxes if they already exist
        if(hitboxes.childElementCount != 0){
            while(hitboxes.firstElementChild){
                hitboxes.removeChild(hitboxes.firstElementChild);
            }
        }

        let originalTemplate = document.getElementById("ledHitboxTemplate")!;
        let centerTop = (canvas.height - originalTemplate.getBoundingClientRect().height)/2;
        let centerLeft = (canvas.width - originalTemplate.getBoundingClientRect().width)/2;

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

            template.addEventListener("click", function(){ cues.editor.channels.toggle(id) });

            hitboxes.appendChild(template);
        }
    }

    //Draw colour to one LED
    export function drawLed(index: number, color: Color){
        color = defaultValue(color, new Color('black'));
        index = index % numLeds;
        ctx.lineWidth = ringWidth * canvasScale;
        ctx.strokeStyle = color.getHex();
        ctx.beginPath();
        ctx.arc(ringX, ringY, ringR * canvasScale, 
            (ledLastStartRad + ledsStepRad * index) * Math.PI, 
            (ledLastEndRad + ledsStepRad * index) * Math.PI
        );
        ctx.stroke();
    };

    export function drawColor(color: Color){
        //draw black onto the display if there's no cue to read from
        let currentColors = Array(numLeds).fill(color, 0, numLeds);
        for(let i = 0; i < numLeds; i++){
            drawLed(i, currentColors[i]);
        }
        redrawDot(currentColors[0]);
    }

    export function drawCue(cue: Cue){
        let currentColor = new Color('black');
        let duration = cue.duration;

        for(let i = numLeds - 1; i >= 0; i--){
            if(cue.channels[i]){
                currentColor = cue.interpolate(times.forLED(cue, i)/duration);
                
            } else {
                currentColor = new Color('black');
            }
            drawLed(i, currentColor);
        }

        //redraw dot for colour of topmost LED
        redrawDot(currentColor);
        times.step(cues.current().duration);
    }

    export function drawSchedule(schedule: Schedule){
		//determine total duration of schedule
		let totalDur = schedules.current().duration;

		//determine which cues are visible
		let time = times.current() % totalDur;
		let visibleCues: Cue[] = [];
		for(let i in schedule.periods){
			let period = schedule.periods[i];
			let cue = cues.get(period.cue_id);

            let visible = true;
            let totalDelay = 0;
            for(let j in period.delays){
                let currDelay = totalDelay + period.delays[j];
                if (currDelay <= time){
                    visible = !visible;
                    //TODO: Add this line again when delays are changed to be relative
                    //totalDelay = currDelay;
                } else {
                    break;
                }
            }
			if(visible){
                visibleCues.push(cue);
			}
		}

		let finalColors: Color[] = [];
		//calculate colours for each LED
		for(let i = numLeds - 1; i >= 0; i--){
			let colors: Color[] = [];
			for(let cue of visibleCues){
				if(cue.channels[i]){
					colors.push(cue.interpolate(times.forLED(cue, i, time)/cue.duration));
				}
			}

			//TODO: Actually mix colors!
			finalColors[i] = colors[0];
		}	

		for(let i in finalColors){
			drawLed(parseInt(i), finalColors[i]);
		}

		redrawDot(finalColors[0]);
		times.step(totalDur);
		schedules.editor.updateProgressBarPosition();
    }

    export function startChannelEditing(){
		hitboxes.removeAttribute("hidden");
	}

	export function stopChannelEditing(){
        hitboxes.setAttribute("hidden", "");
	}

    export function init(){
        drawCase();
        setupLedHitboxes();
    }
}