
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

            template.addEventListener("click", function(){toggleChannel(id)});

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