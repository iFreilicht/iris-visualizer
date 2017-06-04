/// <reference path="./helpers/defaultValue.ts"/>
/// <reference path="./cues.ts"/>

class Schedule{
    duration: number;

    periods: Period[];

    constructor(p?: Partial<Schedule>){
        p = defaultValue(p, {});

        this.periods = defaultValue(p.periods, []);
        this.duration = defaultValue(p.duration, 3000);
    }

    period(cue_id: number) : Period | null{
        for(let i in this.periods){
            let currPeriod = this.periods[i];
            if(currPeriod != null && currPeriod.cue_id == cue_id){
                return currPeriod;
            }
        }
        return null;
    }

    addPeriod(cue_id: number) : Period{
        let period = new Period(cue_id);
        this.periods[firstFreeIndex(this.periods)] = period;
        return period;
    }
}

class Period{
    cue_id: number;
    delays: number[]; //The Cue will always be started at delay 0 and run indefinitely from there.
                      //At the first mark, it will be stopped. 
                      //At the second mark, it will be started again and so on.

    constructor(cue_id: number, delays: number[] = []){
        this.cue_id = cue_id;
        this.delays = delays;
    }

}