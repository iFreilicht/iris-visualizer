namespace transitionPicker{
    //HTML Elements
        let mainDiv = document.getElementById("transitionPicker")!;
    //---

    //helpers
        function colorToHLCoords(color: Color){
            let h = (color.hue()/360) * gradient.width;
            let l = (color.lightness()/100) * gradient.height;
            return [h, l];
        }

        function HLCoordsToColor(h: number, l: number){
            //convert HL coordinates
            h = (h/gradient.width) * 360;
            l = (l/gradient.height) * 100;
            //clamp coordinates. They might be slightly over or under limits.
            h = Math.min(Math.max(h, 0), 360);
            l = Math.min(Math.max(l, 0), 100);
            let result = new Color();
            result.saturation(100)
            result.hue(h)
            result.lightness(l);
            return result;
        }
    //---

    namespace gradient{
        //HTML elements
        let canvas = document.getElementById("transitionPickerHLGradient") as HTMLCanvasElement;
        let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        export const width = canvas.width;
        export const height = canvas.height;

        export function redraw(){
            let hGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
            hGrad.addColorStop(0   / 359, 'hsl(0,  100%,50%)');
            hGrad.addColorStop(60  / 359, 'hsl(60, 100%,50%)');
            hGrad.addColorStop(120 / 359, 'hsl(120,100%,50%)');
            hGrad.addColorStop(180 / 359, 'hsl(180,100%,50%)');
            hGrad.addColorStop(240 / 359, 'hsl(240,100%,50%)');
            hGrad.addColorStop(300 / 359, 'hsl(300,100%,50%)');
            hGrad.addColorStop(359 / 359, 'hsl(359,100%,50%)');
            ctx.fillStyle = hGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            let vGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            vGrad.addColorStop(0.49, 'hsla(0,0%,100%,0)');
            vGrad.addColorStop(1, 'hsla(0,0%,100%,1)');
            ctx.fillStyle = vGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            vGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            vGrad.addColorStop(0, 'hsla(0,0%,0%,1)');
            vGrad.addColorStop(0.51, 'hsla(0,0%,0%,0)');
            ctx.fillStyle = vGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    //drawing the transition line
    export namespace line{
        //HTML elements
        let canvas = document.getElementById("transitionPickerHLLine") as HTMLCanvasElement;
        let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        export let endCapRadius = 4;
        export let width = 2;

        export function redraw(cue: Cue){
            //draw line
            function drawLine(start_h: number, start_l: number, end_h: number, end_l: number){
                ctx.beginPath();
                ctx.lineWidth = 5;
                let lGrad = ctx.createLinearGradient(start_h, start_l, end_h, end_l);
                    lGrad.addColorStop(0, color_grad_start);
                    lGrad.addColorStop(1, color_grad_end);
                ctx.strokeStyle = lGrad;
                ctx.moveTo(start_h, start_l);
                ctx.lineTo(end_h, end_l);		
                ctx.stroke();
            }

            //draw end caps
            function drawEndCap(h: number, l: number, strokeStyle: string, fillStyle: string){
                ctx.beginPath();
                ctx.arc(h, l, endCapRadius, 0, 2 * Math.PI);
                ctx.strokeStyle = strokeStyle;
                ctx.fillStyle = fillStyle;
                ctx.fill();
                ctx.lineWidth = width;
                ctx.stroke();
            }

            //clear canvas
            clear();
            //get coordinates
            let [start_h, start_l] = colorToHLCoords(cue.start_color);
            let [end_h, end_l] = colorToHLCoords(cue.end_color);
            //calculate gradient colors with relative negative lightness
            let l_grad_start = (100 - cue.start_color.lightness());
            let l_grad_end = (100 - cue.end_color.lightness());
            let color_grad_start = 'hsl(0,0%,' + l_grad_start + '%)';
            let color_grad_end = 'hsl(0,0%,' + l_grad_end + '%)';

            if(cue.wrap_hue){
                drawLine(start_h, start_l, end_h + canvas.width, end_l);
                drawLine(start_h - canvas.width, start_l, end_h, end_l);
            }else{
                drawLine(start_h, start_l, end_h, end_l);
            }

            drawEndCap(start_h, start_l, color_grad_start, cue.start_color.getHex());
            drawEndCap(end_h,	end_l, 	 color_grad_end,   cue.end_color.getHex());
        }

        export function clear(){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

    }

    //drawing the colour dot
    export namespace dot{
        let canvas = document.getElementById("transitionPickerHLDot") as HTMLCanvasElement;
        let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        export let radius = 6;

        export function redraw(color: Color){
            clear();
            color = defaultValue(color, new Color('black'));
            ctx.beginPath();
            ctx.arc.apply(ctx, colorToHLCoords(color).concat([radius, 0, 2 * Math.PI]));
            ctx.fillStyle = color.getHex();
            ctx.fill();
            ctx.strokeStyle = 'hsl(0,0%,' + (100 - color.lightness()) + '%)';
            ctx.lineWidth = line.width;
            ctx.stroke();
        }

        export function clear(){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    namespace eventsHandlers{
        //state variables
            let closestDistance: number;
            let closestIndex: number;
            let closestIsStart: boolean;
        //---

        function relocateColorPoint(mouseH: number, mouseL: number){
            let newColor = HLCoordsToColor(mouseH, mouseL);
            if(closestIsStart){
                allCues[closestIndex].start_color = newColor;
            } else {
                allCues[closestIndex].end_color = newColor;
            }
            line.redraw(allCues[closestIndex]);
        }

        function mouseMove(e: MouseEvent){
            let rect = mainDiv.getBoundingClientRect();
            let mouseH = e.clientX - rect.left;
            let mouseL = e.clientY - rect.top;
            relocateColorPoint(mouseH, mouseL);
        }

        export function mouseDown(e: MouseEvent){
            //prevent bubbling
            e.preventDefault();
            //make cursor invisible
            mainDiv.style.cursor = "none";
            //add event handlers
            document.addEventListener("mouseup", mouseUp);
            document.addEventListener("mousemove", mouseMove);
            //caculate which colour is to be modified
            let rect = mainDiv.getBoundingClientRect();
            let mouseH = e.clientX - rect.left;
            let mouseL = e.clientY - rect.top;
            closestDistance = gradient.width + gradient.height;
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
        

        function mouseUp(e: MouseEvent){
            //make cursor visible again
            mainDiv.style.cursor = "crosshair";
            //add event handlers
            document.removeEventListener("mouseup", mouseUp);
            document.removeEventListener("mousemove", mouseMove);
        }
    }

    export function init(){
        mainDiv.addEventListener("mousedown", eventsHandlers.mouseDown);
        gradient.redraw();
    }
}