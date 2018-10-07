/*
    A variant grade that supports Xbox Adaptive (and presumably Xbox One) controllers better.

    The button mappings occur in the order that the patch inputs are arranged on the adaptive controller, so that they
    collectively make an octave (plus a C).

    The "d-pad" is now an axis, and this grade converts those presses to notes as well.

*/
/* globals fluid flocking */
(function () {
    "use strict";

    var gp2m = fluid.registerNamespace("gp2m");


    fluid.registerNamespace("gp2m.harness.xboxOne");

    // Axis values sent by d-pad, rounded to two places.
    gp2m.harness.xboxOne.buttonValues = {
        DOWN:        0.14,
        DOWN_LEFT:   0.43,
        DOWN_RIGHT: -0.14,
        LEFT:        0.71,
        NEUTRAL:    -1.29,
        RIGHT:      -0.43,
        UP:         -1.00,
        UP_LEFT:     1.00,
        UP_RIGHT:   -0.71
    };

    //  57: A  = D-Pad Right
    //  58: A# = D-Pad Up
    //  59: B  = D-Pad Down
    //  60: C  = D-Pad Left
    gp2m.harness.xboxOne.getPitchesForButtonValue = function (buttonValue) {
        var pitches = [];
        var roundedValue = Math.round(buttonValue * 100) / 100;
        switch (roundedValue) {
            case gp2m.harness.xboxOne.buttonValues.RIGHT:
            case gp2m.harness.xboxOne.buttonValues.DOWN_RIGHT:
            case gp2m.harness.xboxOne.buttonValues.UP_RIGHT:
                pitches.push(57);
                break;
            case gp2m.harness.xboxOne.buttonValues.UP:
            case gp2m.harness.xboxOne.buttonValues.UP_LEFT:
            case gp2m.harness.xboxOne.buttonValues.UP_RIGHT:
                pitches.push(58);
                break;
            case gp2m.harness.xboxOne.buttonValues.DOWN:
            case gp2m.harness.xboxOne.buttonValues.DOWN_LEFT:
            case gp2m.harness.xboxOne.buttonValues.DOWN_RIGHT:
                pitches.push(59);
                break;
            case gp2m.harness.xboxOne.buttonValues.LEFT:
            case gp2m.harness.xboxOne.buttonValues.DOWN_LEFT:
            case gp2m.harness.xboxOne.buttonValues.UP_LEFT:
                pitches.push(60);
                break;
        }
        return pitches;
    };

    gp2m.harness.xboxOne.mapAxisToButtons = function (that, currentValue, axisNumber, gamepadNumber) {
        if (axisNumber === 7 && currentValue !== that.previousAxisValue) {
            var noteActions = {};
            var oldPitches = gp2m.harness.xboxOne.getPitchesForButtonValue(that.previousAxisValue);
            var newPitches = gp2m.harness.xboxOne.getPitchesForButtonValue(currentValue);
            if (that.previousAxisValue === gp2m.harness.xboxOne.buttonValues.NEUTRAL) {
                // Send a note on for each new value(s).
                fluid.each(newPitches, function (pitch) {
                    noteActions[pitch] = "noteOn";
                });
            }
            else if (currentValue === gp2m.harness.xboxOne.buttonValues.NEUTRAL) {
                // Send a note off for each previous value
                fluid.each(oldPitches, function (pitch) {
                    noteActions[pitch] = "noteOff";
                });
            }
            else {
                // Send a noteOff for any pitches that are only in the old pitches.
                fluid.each(oldPitches, function (oldPitch) {
                    if (newPitches.indexOf(oldPitch) === -1) {
                        noteActions[oldPitch] = "noteOff";
                    }
                });

                // Send a noteOn for any pitches that are only in the new
                fluid.each(newPitches, function (newPitch) {
                    if (oldPitches.indexOf(newPitch) === -1) {
                        noteActions[newPitch] = "noteOn";
                    }
                });

                // Any pitches that are in both are presumably already playing and should be left alone.
            }

            fluid.each(noteActions, function (event, note) {
                that.send({
                    type:     event,
                    velocity: event === "noteOn" ? that.model.buttonVelocity : 0,
                    note:     note
                });
            });

            that.previousAxisValue = currentValue;
        }
    };

    fluid.defaults("gp2m.harness.xboxOne", {
        gradeNames: ["gp2m.harness"],
        members: {
            previousAxisValue: -1.285714 // Neutral
        },
        rules: {
            buttonToNotes: {
                transform: {
                    type: "fluid.transforms.valueMapper",
                    defaultInputPath: "arguments.0",
                    match: {
                        4:  48, // Y                 -> C
                        3:  49, // X                 -> C#
                        1:  50, // B                 -> D
                        0:  51, // A                 -> D#
                        14: 52, // Right Thumb Press -> E
                        7:  53, // Right Bumper      -> F
                        11: 54, // Menu              -> F#
                        6:  55, // Left Bumper       -> G
                        13: 56  // Left Thumb Press  -> G#
                        //  57: A  = D-Pad Right
                        //  58: A# = D-Pad Up
                        //  59: B  = D-Pad Down
                        //  60: C  = D-Pad Left
                    },
                    noMatch: {
                        outputUndefinedValue: 36
                    }
                }
            }
        },
        listeners: {
            "onAxisChange.mapAxisToButtons": {
                funcName: "gp2m.harness.xboxOne.mapAxisToButtons",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // currentValue, axisNumber, gamepadNumber

            }
        }
    });
})(fluid);
