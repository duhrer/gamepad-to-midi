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

    fluid.registerNamespace("gp2m.oda");

    // TODO: Break out the base grade to work with just a PS4 diagram that both the "smile" and "halloween" grades extend.
    gp2m.oda.decodeTransform = function (transformString) {
        var matches = transformString.match(/translate\((-?[0-9\.]+),(-?[0-9\.]+)\)/);
        return { x: parseInt(matches[1], 10), y: parseInt(matches[2], 10) };
    };

    gp2m.oda.encodeTransform = function (x, y) {
        return "translate(" + x + "," + y + ")";
    };

    gp2m.oda.init = function (that) {
        // Render our SVG content.
        that.container.html(that.options.svgData);

        // TODO: Convert to using repositionable views that update their position based on a model variable.
        // Get the starting location of the "pupils".
        var leftPupil = $(that.container).find("#left-thumb");
        that.pupils.left.startX = parseInt(leftPupil.attr("cx"), 10);
        that.pupils.left.startY = parseInt(leftPupil.attr("cy"), 10);

        var rightPupil = $(that.container).find("#right-thumb");
        that.pupils.right.startX = parseInt(rightPupil.attr("cx"), 10);
        that.pupils.right.startY = parseInt(rightPupil.attr("cy"), 10);

        // Get the starting location of the "teeth"
        var upperTeeth = $(that.container).find("#upper-teeth");
        var startingUpperTeethTransform = upperTeeth.attr("transform");
        var startingUpperTeethCoords = gp2m.oda.decodeTransform(startingUpperTeethTransform);
        that.teeth.upper.startX = startingUpperTeethCoords.x;
        that.teeth.upper.startY = startingUpperTeethCoords.y

        var lowerTeeth = $(that.container).find("#lower-teeth");
        var startingLowerTeethTransform = lowerTeeth.attr("transform");
        var startingLowerTeethCoords = gp2m.oda.decodeTransform(startingLowerTeethTransform);
        that.teeth.lower.startX = startingLowerTeethCoords.x;
        that.teeth.lower.startY = startingLowerTeethCoords.y
    };

    gp2m.oda.paintButton = function (that, buttonIndex, messageType) {
        var selector = "#button-" + buttonIndex;
        var elementToPaint = $(that.container).find(selector);
        if (elementToPaint) {
            var htmlColour = messageType === "noteOn" ? "#00ff00" : "#ffffff00";
            elementToPaint.css("fill", htmlColour);
        }
    };

    // TODO: Convert to using repositionable views that update their position based on a model variable.
    gp2m.oda.movePupil = function (that, axisValue, axisIndex) {
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

    // TODO: Convert to using repositionable views that update their position based on a model variable.
    gp2m.oda.moveTeeth = function (that, buttonValue, buttonIndex) {
        // 6 (left trigger) = upper, 7 (right trigger) = lower
        var teeth = buttonIndex === 6 ? that.teeth.upper : that.teeth.lower;
        var teethSelector = buttonIndex === 6 ? "#upper-teeth" : "#lower-teeth";
        var deflection = buttonIndex === 6 ? that.options.upperTeethDeflection : that.options.lowerTeethDeflection;
        var teethElement = $(that.container).find(teethSelector);
        if (teethElement) {
            var yOffset = buttonValue * deflection;
            var updatedTransform = gp2m.oda.encodeTransform (teeth.startX, teeth.startY + yOffset)
            teethElement.attr("transform", updatedTransform);
        }
    };

    fluid.defaults("gp2m.oda", {
        gradeNames: ["fluid.viewComponent"],
        svgData: flock.midi.interchange.svg.ps4_oda_animated_smile,
        pupilXDeflection: 25,
        pupilYDeflection: 25,
        lowerTeethDeflection: 40,
        upperTeethDeflection: -60,
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
            },
            teeth: {
                upper: {
                    startX: 0,
                    startY: 0
                },
                lower: {
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
            movePupil: {
                funcName: "gp2m.oda.movePupil",
                args: ["{that}", "{arguments}.0", "{arguments}.1"] // axisValue, axisIndex
            }
        }
    });

    fluid.registerNamespace("gp2m.ps4chestra.animated");

    gp2m.ps4chestra.animated.handleButton = function (that, messageType, buttonValue, buttonIndex, gamepadIndex) {
        // Call the underlying function to play notes, et cetera.
        gp2m.ps4chestra.handleButton(that, messageType, buttonValue, buttonIndex, gamepadIndex);

        // Update UI, including for non-playing buttons.
        that.oda.paintButton(buttonIndex, messageType);

        // Special handling for triggers.
        if (buttonIndex === 6 || buttonIndex === 7) {
            gp2m.oda.moveTeeth(that.oda, buttonValue, buttonIndex);
        }
    };

    gp2m.ps4chestra.animated.saveAxisData = function (that, axisValue, axisIndex, gamepadIndex) {
        // Call the base function to play notes, etc.
        gp2m.ps4chestra.saveAxisData(that, axisValue, axisIndex, gamepadIndex);

        // Update UI
        that.oda.movePupil(axisValue, axisIndex);
    };

    fluid.defaults("gp2m.ps4chestra.animated", {
        gradeNames: ["gp2m.ps4chestra"],
        listeners: {
            "onAxisChange.saveAxisData": {
                funcName: "gp2m.ps4chestra.animated.saveAxisData",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // axisValue, axisIndex, gamepadIndex
            },
            "onButtonDown.handleButtonDown": {
                funcName: "gp2m.ps4chestra.animated.handleButton",
                args: ["{that}", "noteOn", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // buttonValue, buttonIndex, gamepadIndex
            },
            "onButtonUp.handleButtonUp": {
                funcName: "gp2m.ps4chestra.animated.handleButton",
                args: ["{that}", "noteOff", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // buttonValue, buttonIndex, gamepadIndex
            }
        },
        components: {
            oda: {
                container: "{that}.dom.oda",
                type: "gp2m.oda"
            }
        }
    });

    fluid.registerNamespace("gp2m.ps4chestra.halloween");

    gp2m.ps4chestra.halloween.handleButton = function (that, messageType, buttonValue, buttonIndex, gamepadIndex) {
        // Call the underlying function to play notes, et cetera.
        gp2m.ps4chestra.handleButton(that, messageType, buttonValue, buttonIndex, gamepadIndex);

        // Update UI, including for non-playing buttons.
        that.oda.paintButton(buttonIndex, messageType);

        // Special handling for triggers.
        if (buttonIndex === 6) {
            that.oda.moveLid(buttonValue);
        }
        else if (buttonIndex === 7) {
            that.oda.moveSmile(buttonValue);
        }
    };

    gp2m.ps4chestra.halloween.saveAxisData = function (that, axisValue, axisIndex, gamepadIndex) {
        var dejitteredAxisValue =gp2m.ps4chestra.halloween.trimToJitter(axisValue, that.options.axisJitterCutoff);

        // Call the base function to play notes, etc.
        gp2m.ps4chestra.saveAxisData(that, dejitteredAxisValue, axisIndex, gamepadIndex);

        // Save the observed value for later angle calculations.
        that.axes[axisIndex] = dejitteredAxisValue;

        // Recalculate the relevant angle.
        // Left eye.
        if (axisIndex === 0 || axisIndex == 1) {
            var leftEyeAngle = gp2m.ps4chestra.halloween.calculateAngle(that, that.axes[0], that.axes[1]);
            that.applier.change("leftEyeAngle", leftEyeAngle);
        }
        // Right eye.
        else {
            var rightEyeAngle = gp2m.ps4chestra.halloween.calculateAngle(that, that.axes[2], that.axes[3]);
            that.applier.change("rightEyeAngle", rightEyeAngle);
        }
    };


    gp2m.ps4chestra.halloween.trimToJitter = function (rawValue, jitterThreshold) {
        return rawValue - (rawValue % jitterThreshold);
    };

    gp2m.ps4chestra.halloween.calculateAngle = function (that, x, y) {
        if (Math.abs(x) < that.options.axisJitterCutoff || Math.abs(y) < that.options.axisJitterCutoff) {
            return 0;
        }
        var radians = Math.atan2(-1 * x, y);
        return Math.round((360 + (radians * (180/Math.PI))) % 360);
    };

    fluid.defaults("gp2m.ps4chestra.halloween", {
        gradeNames: ["gp2m.ps4chestra"],
        axisJitterCutoff: .03,
        model: {
            leftEyeAngle: 0,
            rightEyeAngle: 0
        },
        pitchByButton: {
            // Not used in the underlying grade, but used here.
            6:  48,
            7:  51,
            10: 56,
            11: 60
        },
        members: {
            axes: {
                // Left eye
                0: 0,
                1: 0,
                // Right eye
                2: 0,
                3: 0
            }
        },
        listeners: {
            "onAxisChange.saveAxisData": {
                funcName: "gp2m.ps4chestra.halloween.saveAxisData",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // axisValue, axisIndex, gamepadIndex
            },
            "onButtonDown.handleButtonDown": {
                funcName: "gp2m.ps4chestra.halloween.handleButton",
                args: ["{that}", "noteOn", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // buttonValue, buttonIndex, gamepadIndex
            },
            "onButtonUp.handleButtonUp": {
                funcName: "gp2m.ps4chestra.halloween.handleButton",
                args: ["{that}", "noteOff", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // buttonValue, buttonIndex, gamepadIndex
            }
        },
        components: {
            oda: {
                container: "{that}.dom.oda",
                type: "gp2m.oda.halloween",
                options: {
                    model: {
                        leftEyeAngle: "{gp2m.ps4chestra.halloween}.model.leftEyeAngle",
                        rightEyeAngle: "{gp2m.ps4chestra.halloween}.model.rightEyeAngle"
                    }
                }
            }
        }
    });

    fluid.registerNamespace("gp2m.oda.halloween");

    gp2m.oda.halloween.init = function (that) {
        // Render our SVG content.
        that.container.html(that.options.svgData);

        // Get the starting location of the "lid"
        var lid = $(that.container).find("#lid");
        var lidTransform = lid.attr("transform");
        var lidCoords = gp2m.oda.decodeTransform(lidTransform);
        that.lid.startX = lidCoords.x;
        that.lid.startY = lidCoords.y;

        // {x: -3477.142822265625, y: 40.93446350097656, width: 325.715087890625, height: 322.6015625}
        var leftEyeBounds = document.getElementById("left-eye").getBBox();
        that.eyes.left.cx = leftEyeBounds.x + (leftEyeBounds.width / 2);
        that.eyes.left.cy = leftEyeBounds.y + (leftEyeBounds.height / 2);

        var rightEyeBounds = document.getElementById("right-eye").getBBox();
        that.eyes.right.cx = rightEyeBounds.x + (rightEyeBounds.width / 2);
        that.eyes.right.cy = rightEyeBounds.y + (rightEyeBounds.height / 2);
    };

    gp2m.oda.halloween.updateEye = function (that, selector, angle, coords) {
        var eyeElement = $(that.container).find(selector);
        var rotationTransform = "rotate(" + angle + "," + coords.cx + "," + coords.cy + ")";
        console.log(selector, rotationTransform);
        eyeElement.attr("transform", rotationTransform);
    };

    gp2m.oda.halloween.moveSmile = function (that, percentDeflected) {
        var smileElement = $(that.container).find("#smile");
        if (smileElement) {
            var deflection = that.options.smileDeflection * percentDeflected;
            var updatedTransform = gp2m.oda.encodeTransform (that.smile.startX, that.smile.startY + deflection);
            smileElement.attr("transform", updatedTransform);
        }
    };

    gp2m.oda.halloween.moveLid = function (that, percentDeflected) {
        var lidElement = $(that.container).find("#lid");
        if (lidElement) {
            var deflection = that.options.lidDeflection * percentDeflected;
            var updatedTransform = gp2m.oda.encodeTransform (that.lid.startX, that.lid.startY + deflection);
            lidElement.attr("transform", updatedTransform);
        }
    };

    fluid.defaults("gp2m.oda.halloween", {
        gradeNames: ["fluid.viewComponent"],
        svgData: flock.midi.interchange.svg.halloween_oda,
        lidDeflection: -120,
        smileDeflection: 180,
        members: {
            smile: {
                startX: 0,
                startY: 0
            },
            lid: {
                startX: 0,
                startY: 0
            },
            eyes: {
                left: {
                    cx: 0,
                    cy: 0
                },
                right: {
                    cx: 0,
                    cy: 0
                }
            }
        },
        model: {
            leftEyeAngle: 0,
            rightEyeAngle: 0
        },
        listeners: {
            "onCreate.init": {
                funcName: "gp2m.oda.halloween.init",
                args: ["{that}"]
            }
        },
        invokers: {
            paintButton: {
                funcName: "gp2m.oda.paintButton",
                args: ["{that}", "{arguments}.0", "{arguments}.1"] // buttonIndex, messageType
            },
            moveLid: {
                funcName: "gp2m.oda.halloween.moveLid",
                args: ["{that}", "{arguments}.0"] // deflection
            },
            moveSmile: {
                funcName: "gp2m.oda.halloween.moveSmile",
                args: ["{that}", "{arguments}.0"] // deflection
            }
        },
        modelListeners: {
            leftEyeAngle: {
                excludeSource: "init",
                funcName: "gp2m.oda.halloween.updateEye",
                args: ["{that}", "#left-eye", "{that}.model.leftEyeAngle", "{that}.eyes.left"] // selector, angle, coords
            },
            rightEyeAngle: {
                excludeSource: "init",
                funcName: "gp2m.oda.halloween.updateEye",
                args: ["{that}", "#right-eye", "{that}.model.rightEyeAngle", "{that}.eyes.right"] // selector, angle, coords
            }
        }
    });
})(fluid, flock);
