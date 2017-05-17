/// <reference path="./helpers/defaultValue.ts"/>
/// <reference path="./schedule.ts"/>
/// <reference path="./color/Color.ts"/>

enum RampType{
	linearHSL,
	linearRGB,
	jump
}

// type RampType = 'linearHSL' | 'linearRGB' | 'jump';

// function throwBadRampType(p: never): never{
// 	throw new Error(`Unknown RampType "${p}"!`);
// }

class CueNoColor{
    channels: boolean[];
    reverse: boolean;
    wrap_hue: boolean;
    time_divisor: number;
    delay: number;
    duration: number;
    ramp_type: RampType;
    ramp_parameter: number;
}

type CueSerialized = 
Partial<CueNoColor> &
{ 
    start_color?: string; 
    end_color?: string; 
    offset_color?: string;
};

class Cue extends CueNoColor{
    start_color: Color;
    end_color: Color;
    offset_color: Color;

    constructor(p?: CueSerialized){
        super();
        p = defaultValue(p, {});

		this.channels 		= defaultValue(p.channels, Array(numLeds).fill(true,0,numLeds));
		this.reverse 		= defaultValue(p.reverse, 			false					);
		this.wrap_hue 		= defaultValue(p.wrap_hue, 			false					);
		this.time_divisor 	= defaultValue(p.time_divisor,		numLeds					);
		this.delay 			= defaultValue(p.delay,				0						);
		this.duration 		= defaultValue(p.duration,			3000					);
		this.ramp_type 		= defaultValue(p.ramp_type,			RampType.linearHSL		);
		this.ramp_parameter = defaultValue(p.ramp_parameter,	1						);
		this.start_color 	= new Color(defaultValue(p.start_color,	'#FF0000')          );
		this.end_color 		= new Color(defaultValue(p.end_color, 	'#FF0001')	        );
		this.offset_color 	= new Color(defaultValue(p.offset_color, 'black')           );
    }

    toJSON() : CueSerialized{
        //leave out all unused fields for now
		return {
			channels: this.channels,
			reverse: this.reverse,
			wrap_hue: this.wrap_hue,
			time_divisor: this.time_divisor,
			//delay: this.delay,
			duration: this.duration,
			ramp_type: this.ramp_type,
			ramp_parameter: this.ramp_parameter,
			start_color: this.start_color.getHSL(),
			end_color: this.end_color.getHSL(),
			//offset_color: this.offset_color.getHSL()
		};
    }


}