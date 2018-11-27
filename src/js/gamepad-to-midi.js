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
            onButtonUp:   null  // fired with: buttonNumber, gamepadNumber
        },
        model: {
            gamepads: {} // Store button / axis state for each gamepad.
        },
        modelListeners: {
            "gamepads.*": {
                funcName: "gp2m.eventBroker.handleGamepadChange",
                args:     ["{that}", "{change}"]
            }
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
        fluid.each(activeGamepads, function (gamepad, index) {
            var gamepadIndex = parseInt(index, 10);

            // By default there are four slots, and any unused slot returns null, so ignore those.
            if (gamepad === null) {
                return;
            }

            // a) all buttons that are now pressed fire an `onButtonDown` action.
            // b) all buttons that are released fire an `onButtonUp` action.
            fluid.each(gamepad.buttons, function (button, buttonIndex) {
                that.applier.change(["gamepads", gamepadIndex, "buttons", buttonIndex], button.pressed);
            });

            // c) changes in axes are relayed as `onAxisChanged` events.
            fluid.each(gamepad.axes, function (axisValue, axisIndex) {
                that.applier.change(["gamepads", gamepadIndex, "axes", axisIndex], axisValue);
            });
        });
    };

    /**
     *
     * Handle a change to a single gamepad's state, including the state of all buttons and axes.
     *
     * @param {Object} that - The event broker component.
     * @param {Object} change - The change applier's "receipt" for the change.
     *
     */
    gp2m.eventBroker.handleGamepadChange = function (that, change) {
        var gamepadIndex = parseInt(change.path[change.path.length - 1], 10);

        // a) all buttons that are now pressed fire an `onButtonDown` action.
        // b) all buttons that are released fire an `onButtonUp` action.
        fluid.each(change.value.buttons, function (buttonPressed, buttonIndex) {
            var currentButtonValue = fluid.get(change.oldValue, ["buttons", buttonIndex]);
            if (currentButtonValue !== buttonPressed) {
                var eventToFire = buttonPressed ? "onButtonDown" : "onButtonUp";
                that.events[eventToFire].fire(buttonIndex, gamepadIndex);
            }
        });

        // c) changes in axes are relayed as `onAxisChanged` events.
        fluid.each(change.value.axes, function (axisValue, axisIndex) {
            var currentAxisValue = fluid.get(change.oldValue, ["axes", axisIndex]);
            if (currentAxisValue !== axisValue) {
                that.events.onAxisChange.fire(axisValue, axisIndex, gamepadIndex);
            }
        });
    };

    fluid.defaults("gp2m.harness", {
        gradeNames: ["gp2m.eventBroker", "fluid.viewComponent"],
        selectors: {
            output: ".midi-output"
        },
        model: {
            buttonVelocity: 100,
            midiChannel:    0
        },
        offsetPerGamepad: 12,
        // TODO: Add a mechanism for having different rules for different gamepads as soon as we have a use case.
        rules: {
            filters: {
                buttons: {
                    // required because the Xbox Adaptive Controller sends double button presses, i.e. 0 and 15 at the same time.
                    onlyFirstFifteenButtons: {
                        "": {
                            transform: {
                                type: "fluid.transforms.valueMapper",
                                defaultInputPath: "arguments.1",
                                match: {
                                    0:  true,
                                    1:  true,
                                    2:  true,
                                    3:  true,
                                    4:  true,
                                    5:  true,
                                    6:  true,
                                    7:  true,
                                    8:  true,
                                    9:  true,
                                    10: true,
                                    11: true,
                                    12: true,
                                    13: true,
                                    14: true
                                },
                                noMatch: {
                                    outputUndefinedValue: false
                                }
                            }
                        }
                    },
                },
                axes: {
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
                                14: 62
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
            "onAxisChange.handleAxisChange": {
                funcName: "gp2m.harness.handleEvent",
                args: ["{that}", "onAxisChange", "@expand:fluid.makeArray({arguments})", "{that}.options.rules.filters.axes"]
            },
            "onButtonDown.handleButtonDown": {
                funcName: "gp2m.harness.handleEvent",
                args: ["{that}", "onButtonDown", "@expand:fluid.makeArray({arguments})", "{that}.options.rules.filters.buttons"]
            },
            "onButtonUp.handleButtonUp": {
                funcName: "gp2m.harness.handleEvent",
                args: ["{that}", "onButtonUp", "@expand:fluid.makeArray({arguments})", "{that}.options.rules.filters.buttons"]
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
     * @param {Array<Object>} filterRules - A model transformation rule that evaluates to `true` if the event should be relayed.
     *
     */
    gp2m.harness.handleEvent = function (that, eventKey, eventArgs, filterRules) {
        var toTransform = {arguments: eventArgs, model: that.model};

        // Optional filtering to (for example) allow filtering by channel.
        var isAllowed = true;
        fluid.each(filterRules, function (filterRule) {
            if (isAllowed) {
                isAllowed = fluid.model.transformWithRules(toTransform, filterRule);
            }
        });

        if (isAllowed) {
            var rules   = fluid.get(that.options.rules, [eventKey]);
            if (rules) {
                var payload = fluid.model.transformWithRules(toTransform, rules);

                that.send(payload);
            }
        }
    };

    /**
     *
     * Transmit the results of a transformation to a MIDI output.
     *
     * @param {Object} that - The harness component.
     * @param {Object} payload - The payload (MIDI message) to transmit.
     *
     */
    gp2m.harness.send = function (that, payload) {
        var output = fluid.get(that, "output.connection");
        if (output) {
            output.send(payload);
        }
    };
})(fluid);
