/* globals fluid flocking */
(function (fluid) {
    "use strict";
    //var flocking = fluid.registerNamespace("flocking");
    var gp2m = fluid.registerNamespace("gp2m");

    // TODO: Define a "controller disconnected" event handler that turns off any active buttons and clears axis data for missing controllers
    // TODO: Define a "controller connected" event handler that activates any buttons already pressed?

    fluid.defaults("gp2m.eventBroker", {
        gradeNames: ["fluid.component"],
        events: {
            onAxisChange: null, // fired with: currentValue, axisNumber, gamepadNumber
            onButtonDown: null, // fired with: buttonNumber, gamepadNumber
            onButtonUp: null    // fired with: buttonNumber, gamepadNumber
        },
        members: {
            gamepads: {} // Store button / axis state for each gamepad.
        },
        components: {
            poller: {
                type: "berg.clock.raf",
                options: {
                    freq: 25, // times per second
                    listeners: {
                        "onTick.pollGamepads": {
                            funcName: "gp2m.eventBroker.pollGamepads",
                            args: ["{eventBroker}"]
                        },
                        "onCreate.start": {
                            func: "{poller}.start"
                        }
                    }
                }
            }
        }
    });

    gp2m.eventBroker.pollGamepads = function (that) {
        var activeGamepads = navigator.getGamepads();
        fluid.each(activeGamepads, function (gamepad, gamepadIndex) {
            // By default there are four slots, and any unused slot returns null, so ignore those.
            if (gamepad === null) {
                return;
            }

            // a) all buttons that are now pressed fire an `onButtonDown` action.
            // b) all buttons that are released fire an `onButtonUp` action.
            fluid.each(gamepad.buttons, function (button, buttonIndex) {
                if (fluid.get(that.gamepads, [gamepadIndex, "buttons", buttonIndex]) !== button.pressed) {
                    var eventToFire = button.pressed ? "onButtonDown" : "onButtonUp";
                    that.events[eventToFire].fire(buttonIndex, gamepadIndex);
                }

                fluid.set(that.gamepads, [gamepadIndex, "buttons", buttonIndex], button.pressed);
            });

            // c) changes in axes are relayed as `onAxisChanged` events.
            fluid.each(gamepad.axes, function (axisValue, axisIndex) {
                var currentAxisValue = fluid.get(that.gamepads, [gamepadIndex, "axes", axisIndex]);
                if (currentAxisValue !== axisValue) {
                    that.events.onAxisChange.fire(axisValue, axisIndex, gamepadIndex);
                }

                fluid.set(that.gamepads, [gamepadIndex, "axes", axisIndex], axisValue);
            });
        });
    };

    // TODO: Wire this up to a MIDI output selector
    fluid.defaults("gp2m.harness", {
        gradeNames: ["gp2m.eventBroker", "fluid.viewComponent"],
        selectors: {
            output: ".midi-output"
        },
        model: {
            midiChannel: 0,
            buttonVelocity: 100
        },
        offsetPerGamepad: 12,
        // TODO: Add a mechanism for having different rules for different gamepads as soon as we have a use case.
        rules: {
            onlyVerticalAxes: {
                "": {
                    transform: {
                        type: "fluid.transforms.valueMapper",
                        defaultInputPath: "arguments.1",
                        match: {
                            0: false,
                            1: true,
                            2: false,
                            3: true
                        },
                        noMatch: {
                            outputUndefinedValue: false
                        }
                    }
                }
            },
            buttonToNotes: {
                transform: {
                    type: "fluid.transforms.binaryOp",
                    "left": {
                        transform: {
                            type: "fluid.transforms.valueMapper",
                            defaultInputPath: "arguments.0",
                            match: {
                                0:  48,
                                1:  49,
                                2:  50,
                                3:  51,
                                4:  52,
                                5:  53,
                                6:  54,
                                7:  55,
                                8:  56,
                                9:  57,
                                10: 58,
                                11: 59,
                                12: 60,
                                13: 61,
                                14: 62,
                                15: 63,
                                16: 64,
                                17: 65,
                                18: 66,
                                19: 67,
                            },
                            noMatch: {
                                outputUndefinedValue: 36
                            }
                        }
                    },
                    "right": {
                        transform: {
                            type: "fluid.transforms.binaryOp",
                            left: "{that}.options.offsetPerGamepad",
                            rightPath: "arguments.1",
                            operator: "*"
                        }
                    },
                    "operator": "+"
                }
            },
            onAxisChange: {
                type: { transform: { type: "fluid.transforms.literalValue", input: "pitchbend" } },
                channel: "model.midiChannel",
                value: {
                    transform: {
                        type: "fluid.transforms.binaryOp",
                        "left": {
                            transform: {
                                type: "fluid.transforms.binaryOp",
                                leftPath: "arguments.0",
                                right: 8192,
                                operator: "*"
                            }
                        },
                        "right": 8192,
                        "operator": "+"
                    }
                }
            },
            onButtonDown: {
                type: { transform: { type: "fluid.transforms.literalValue", input: "noteOn"} },
                channel: "model.midiChannel",
                velocity: "model.buttonVelocity",
                note: "{that}.options.rules.buttonToNotes"
            },
            onButtonUp: {
                type: { transform: { type: "fluid.transforms.literalValue", input: "noteOff"} },
                channel: "model.midiChannel",
                velocity: { transform: { type: "fluid.transforms.literalValue", input: 0 } },
                note: "{that}.options.rules.buttonToNotes"
            }

        },
        listeners: {
            onAxisChange: {
                funcName: "gp2m.harness.handleEvent",
                args: ["{that}", "onAxisChange", "@expand:fluid.makeArray({arguments})", "{that}.options.rules.onlyVerticalAxes"]
            },
            onButtonDown: {
                funcName: "gp2m.harness.handleEvent",
                args: ["{that}", "onButtonDown", "@expand:fluid.makeArray({arguments})"]
            },
            onButtonUp: {
                funcName: "gp2m.harness.handleEvent",
                args: ["{that}", "onButtonUp", "@expand:fluid.makeArray({arguments})"]
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

    /**
     *
     * Respond to a gamepad event, transforming the event payload into a MIDI message for further transmission.
     *
     * @param {Object} that - The harness component itself.
     * @param {String} eventKey - The event we are responding to (used to look up transformation rules).
     * @param {Array<Any>} eventArgs - The arguments passed when firing the event (varies by event).
     * @param {Object} filterRule - A model transformation rule that evaluates to `true` if the event should be relayed.
     *
     */
    gp2m.harness.handleEvent = function (that, eventKey, eventArgs, filterRule) {
        var toTransform = {arguments: eventArgs, model: that.model};

        // Optional filtering to (for example) allow filtering by channel.
        var isAllowed = !filterRule || fluid.model.transformWithRules(toTransform, filterRule);
        if (isAllowed) {
            var rules   = that.options.rules[eventKey];
            var payload = fluid.model.transformWithRules(toTransform, rules);

            that.send(payload);
        }
    };

    gp2m.harness.send = function (that, payload) {
        var output = fluid.get(that, "output.connection");
        if (output) {
            output.send(payload);
        }
    };
})(fluid);
