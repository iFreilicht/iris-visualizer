/// <reference path="./helpers/defaultValue.ts"/>

class Schedule{
    periods: Period[];

    constructor(p?: Partial<Schedule>){
        p = defaultValue(p, {});
		
		this.periods = defaultValue(p.periods, []);
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