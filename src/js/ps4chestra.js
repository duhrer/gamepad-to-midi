/*

    Turn a PS4 controller into an instrument with tonnetz-like tuning and an onscreen UI.

 */
(function (fluid, flock) {
    "use strict";

    fluid.registerNamespace("gp2m.ps4chestra");

    gp2m.ps4chestra.handleButton = function (that, messageType, buttonValue, buttonIndex, gamepadIndex) {
        var sendPitch = that.options.pitchByButton[buttonIndex];
        if (sendPitch) {
            var velocity = Math.round(buttonValue * 127);
            that.send({
                channel: 0,
                type: messageType,
                note: sendPitch,
                velocity: velocity
            });
        }

        // Update UI, including for non-playing buttons.
        that.oda.paintButton(buttonIndex, messageType);
    };

    gp2m.ps4chestra.saveAxisData = function (that, axisValue, axisIndex, gamepadIndex) {
        // Both analog sticks suffer from "jitter", fluctuations in value that we have to smooth out here to avoid
        // overwhelming whatever instrument we're playing with constant micro variations on modwheel or pitchbend values.
        var smoothedValue = axisValue - (axisValue % that.options.jitterThreshhold);
        // pitchbend
        if (axisIndex === 1) {
            var pitchBendValue = 8192 + Math.round(8192 * smoothedValue * -1); // Down is 1 on the PS4 dualshock.
            that.applier.change("pitchbend", pitchBendValue);
        }
        // mod wheel
        else if (axisIndex === 3) {
            var modWheelValue = Math.round(63 + (64 * smoothedValue * -1)); // Down is 1 on the PS4 dualshock.
            that.applier.change("modwheel", modWheelValue);
        }

        // Update UI
        that.oda.paintPupil(axisValue, axisIndex);
    };

    gp2m.ps4chestra.handlePitchbendChange = function (that) {
        that.send({
            type:    "pitchbend",
            channel: that.model.midiChannel,
            value:   that.model.pitchbend
        });
    };


    gp2m.ps4chestra.handleModwheelChange = function (that) {
        that.send({
            type:    "control",
            channel: that.model.midiChannel,
            number:  1,
            value:   that.model.modwheel
        });
    };

    fluid.registerNamespace("gp2m.oda");

    gp2m.oda.init = function (that) {
        // Render our SVG content.
        that.container.html(that.options.svgData);

        // Get the starting location of the "pupils".
        var leftPupil = $(that.container).find("#left-thumb");
        that.pupils.left.startX = parseInt(leftPupil.attr("cx"), 10);
        that.pupils.left.startY = parseInt(leftPupil.attr("cy"), 10);

        var rightPupil = $(that.container).find("#right-thumb");
        that.pupils.right.startX = parseInt(rightPupil.attr("cx"), 10);
        that.pupils.right.startY = parseInt(rightPupil.attr("cy"), 10);
    };

    gp2m.oda.paintButton = function (that, buttonIndex, messageType) {
        var selector = "#button-" + buttonIndex;
        var elementToPaint = $(that.container).find(selector);
        if (elementToPaint) {
            var htmlColour = messageType === "noteOn" ? "#00ff00" : "#ffffff00"
            elementToPaint.css("fill", htmlColour);
        }
    };

    gp2m.oda.paintPupil = function (that, axisValue, axisIndex) {
        var pupil = axisIndex < 2 ? that.pupils.left : that.pupils.right;
        var pupilSelector = axisIndex < 2 ? "#left-thumb" : "#right-thumb";
        var pupilElement = $(that.container).find(pupilSelector);
        if (pupilElement) {
            // y-axis control
            if (axisIndex % 2) {
                var yOffset = axisValue * that.options.pupilYDeflection;
                pupilElement.attr("cy", pupil.startY + yOffset);
            }
            // x-axis control
            else {
                var xOffset = axisValue * that.options.pupilXDeflection;
                pupilElement.attr("cx", pupil.startX + xOffset);
            }
        }
    };

    fluid.defaults("gp2m.oda", {
        gradeNames: ["fluid.viewComponent"],
        svgData: flock.midi.interchange.svg.ps4_oda,
        pupilXDeflection: 25,
        pupilYDeflection: 25,
        members: {
            pupils: {
                left: {
                    startX:  0,
                    startY:  0,
                },
                right: {
                    startX: 0,
                    startY: 0
                }
            }
        },
        listeners: {
            "onCreate.init": {
                funcName: "gp2m.oda.init",
                args: ["{that}"]
            }
        },
        invokers: {
            paintButton: {
                funcName: "gp2m.oda.paintButton",
                args: ["{that}", "{arguments}.0", "{arguments}.1"] // buttonIndex, messageType
            },
            paintPupil: {
                funcName: "gp2m.oda.paintPupil",
                args: ["{that}", "{arguments}.0", "{arguments}.1"] // axisValue, axisIndex
            }
        }
        // TODO: invoker to draw or move "pupils" around
    });

    fluid.defaults("gp2m.ps4chestra", {
        gradeNames: ["gp2m.eventBroker", "fluid.viewComponent"],
        selectors: {
            output: ".midi-output",
            oda: ".ps4-oda-container"
        },
        jitterThreshhold: 0.025,
        model: {
            buttonVelocity: 100,
            midiChannel:    0,
            pitchbend: 0,
            modwheel: 63
        },
        // Our contract is much simpler than other instruments in this package, so we avoid using transforms here.
        pitchByButton: {
            0:  50, // D2
            1:  53, // F2
            2:  58, // A#2
            3:  49, // C#2
            4:  52, // E2 (not part of tonnetz scheme)
            5:  52, // E2 (not part of tonnetz scheme)
            6:  false, // Reserved for future use as part of a velocity control scheme.
            7:  false, // Reserved for future use as part of a velocity control scheme.
            8:  50, // D2
            9:  57, // A2
            10: false, // Pitchbend stick press, does not play, but highlights onscreen.
            11: false, // Mod wheel stick press, does not play, but highlights onscreen.
            12: 59, // B2
            13: 48, // C2
            14: 56, // G#2
            15: 51, // D#2
            16: 55, // G2
            17: 54  // F#2
        },
        listeners: {
            "onAxisChange.saveAxisData": {
                funcName: "gp2m.ps4chestra.saveAxisData",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // axisValue, axisIndex, gamepadIndex
            },
            "onButtonDown.handleButtonDown": {
                funcName: "gp2m.ps4chestra.handleButton",
                args: ["{that}", "noteOn", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // buttonValue, buttonIndex, gamepadIndex
            },
            "onButtonUp.handleButtonUp": {
                funcName: "gp2m.ps4chestra.handleButton",
                args: ["{that}", "noteOff", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // buttonValue, buttonIndex, gamepadIndex
            }
        },
        modelListeners: {
            "pitchbend": {
                funcName: "gp2m.ps4chestra.handlePitchbendChange",
                args: ["{that}"]
            },
            "modwheel": {
                funcName: "gp2m.ps4chestra.handleModwheelChange",
                args: ["{that}"]
            }
        },
        invokers: {
            send: {
                funcName: "gp2m.harness.send",
                args: ["{that}", "{arguments}.0"] // payload
            }
        },
        components: {
            enviro: {
                type: "flock.enviro"
            },
            oda: {
                container: "{that}.dom.oda",
                type: "gp2m.oda"
            },
            output: {
                type: "flock.ui.midiConnector",
                container: "{that}.dom.output",
                options: {
                    portType: "output",
                    components: {
                        midiPortSelector: {
                            options: {
                                strings: {
                                    selectBoxLabel: "MIDI Output",
                                }
                            }
                        }
                    }
                }
            }
        }
    });
})(fluid, flock);
