//Don't modify this file directly! 
//Use the "Save" functionality of this web-app to generate
//all the content between the two backticks

let example_cues =
`
{
  "cues": [
    {
      "name": "Rainbow",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": false,
      "wrap_hue": false,
      "time_divisor": 12,
      "duration": 3000,
      "ramp_type": 0,
      "ramp_parameter": 1,
      "start_color": "hsl(0, 100%, 50%)",
      "end_color": "hsl(360, 100%, 50%)"
    },
    {
      "name": "Breathing",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": false,
      "wrap_hue": false,
      "time_divisor": 1,
      "duration": 3800,
      "ramp_type": 0,
      "ramp_parameter": 0.38,
      "start_color": "hsl(8, 100%, 5%)",
      "end_color": "hsl(84, 100%, 62%)"
    },
    {
      "name": "Simple Jump",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": true,
      "wrap_hue": false,
      "time_divisor": 12,
      "duration": 900,
      "ramp_type": 2,
      "ramp_parameter": 0.5,
      "start_color": "hsl(61, 100%, 51%)",
      "end_color": "hsl(306, 100%, 50%)"
    },
    {
      "name": "Clock 1m",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": false,
      "wrap_hue": false,
      "time_divisor": 12,
      "duration": 60000,
      "ramp_type": 2,
      "ramp_parameter": 0.08,
      "start_color": "hsl(0, 0%, 100%)",
      "end_color": "hsl(0, 0%, 0%)"
    },
    {
      "name": "Borealis",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": false,
      "wrap_hue": false,
      "time_divisor": 12,
      "duration": 3500,
      "ramp_type": 0,
      "ramp_parameter": 1,
      "start_color": "hsl(121, 100%, 95%)",
      "end_color": "hsl(307, 100%, 15%)"
    },
    {
      "name": "Double Blue",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": false,
      "wrap_hue": false,
      "time_divisor": 6,
      "duration": 700,
      "ramp_type": 0,
      "ramp_parameter": 0.5,
      "start_color": "hsl(272, 100%, 6%)",
      "end_color": "hsl(184, 100%, 51%)"
    },
    {
      "name": "Wrap Pink",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": false,
      "wrap_hue": true,
      "time_divisor": 12,
      "duration": 3000,
      "ramp_type": 0,
      "ramp_parameter": 1,
      "start_color": "hsl(310, 100%, 50%)",
      "end_color": "hsl(103, 100%, 95%)"
    },
    {
      "name": "MirrorbowR",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false
      ],
      "reverse": false,
      "wrap_hue": false,
      "time_divisor": 12,
      "duration": 3000,
      "ramp_type": 0,
      "ramp_parameter": 1,
      "start_color": "hsl(0, 100%, 50%)",
      "end_color": "hsl(360, 100%, 50%)"
    },
    {
      "name": "MirrorbowL",
      "channels": [
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": true,
      "wrap_hue": false,
      "time_divisor": 12,
      "duration": 3000,
      "ramp_type": 0,
      "ramp_parameter": 1,
      "start_color": "hsl(0, 100%, 50%)",
      "end_color": "hsl(360, 100%, 50%)"
    },
    {
      "name": "Bounce C/W",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": false,
      "wrap_hue": false,
      "time_divisor": 6,
      "duration": 1000,
      "ramp_type": 2,
      "ramp_parameter": 0.16,
      "start_color": "hsl(0, 100%, 100%)",
      "end_color": "hsl(0, 100%, 0%)"
    },
    {
      "name": "Bounce CC/W",
      "channels": [
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true
      ],
      "reverse": true,
      "wrap_hue": false,
      "time_divisor": 6,
      "duration": 1000,
      "ramp_type": 2,
      "ramp_parameter": 0.16,
      "start_color": "hsl(0, 100%, 100%)",
      "end_color": "hsl(0, 100%, 0%)"
    },
    null
  ],
  "schedules": [
    {
      "periods": [
        {
          "cue_id": 8,
          "delays": []
        },
        {
          "cue_id": 7,
          "delays": []
        }
      ],
      "duration": 3000
    },
    {
      "periods": [
        {
          "cue_id": 9,
          "delays": [
            1000
          ]
        },
        {
          "cue_id": 10,
          "delays": [
            0,
            1000
          ]
        }
      ],
      "duration": 2000
    }
  ]
}
`