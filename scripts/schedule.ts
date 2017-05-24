/// <reference path="./helpers/defaultValue.ts"/>
/// <reference path="./cues.ts"/>

class Schedule{
    periods: Period[];

    constructor(p?: Partial<Schedule>){
        p = defaultValue(p, {});
		
		this.periods = defaultValue(p.periods, []);
    }

    totalDuration(){
		let total = 0;

		for(let i in this.periods){
			let period = this.periods[i];
			let t = period.delay + cues.get(period.cue_id).duration;
			if(t > total){
				total = t;
			}
		}

		return total;
    }
}

class Period{
    cue_id: number;
    delay: number;

    constructor(cue_id: number, delay = 0){
        this.cue_id = cue_id;
        this.delay = delay;
    }

}