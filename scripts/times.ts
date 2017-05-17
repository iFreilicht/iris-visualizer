
namespace times{
    export const pollingInterval = 16;
    let currentTime = 0;

    export function current(){
        return currentTime;
    }

	export function reset(){
		currentTime = 0;
	}

	export function step(duration: number){
		currentTime = (currentTime + pollingInterval) % duration;
	}

	export function forLED(cue: Cue, led: number, time = currentTime){
		let id = cue.reverse ? led : (numLeds - led);
		return (time + ((cue.duration/cue.time_divisor) * id)) % cue.duration;	
    }
}