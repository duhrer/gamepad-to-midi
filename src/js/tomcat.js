/*

    A setup to drive the Akai Tomcat using a Microsoft Adaptive Controller and the Logitech Adaptive Gaming Kit.

    The Adaptive Controller has 19 inputs, including four analog inputs.  By using the large physical controls on the
    Adaptive Controller itself and the 12 Logitech buttons, we have 14 total "notes".  Five of these are used for the
    individual drums (other than the toms).  The remaining seven notes are all used for the toms.

    The notes used are based on information from this forum post:

    https://getsatisfaction.com/akai_professional/topics/is-there-a-midi-implementation-chart-available-for-the-akai-rhythm-wolf-the-user-manual-does-not-contain-one

    Pitch values adjusted upwards from:

    https://newt.phys.unsw.edu.au/jw/notes.html

    Here is the mapping I've chosen to use.

    Channel 10:

    • Kick Drum    = C1  (24) = Built-in button = A     = B0
    • Snare Drum   = D1  (26) = Built-in button = B     = B1
    • Clap         = E1  (28) = large button    = Xbox  = B16
    • Open Hihat   = F#1 (30) = large button    = LB    = B4
    • Closed Hihat = G#1 (32) = large button    = RB    = B5


    Channel 1:

    • Disco Toms: C0 (12) through to D#3 (51) = 3 small buttons, 4 sensitive buttons, 2 triggers

    || [] () [] () [] () [] ||

    C0  (12) = B2
    E0  (16) = B3
    G#0 (20) = B6
    C1  (24) = B7
    E1  (28) = B8
    G#1 (32) = B12
    C2  (36) = B13
    E2  (40) = B14
    G#2 (44) = B15

    TODO: Create a diagram for the docs.

    A button          = B0
    B button          = B1
    X button          = B2
    Y button          = B3
    Left Bumper       = B4
    Right Bumper      = B5
    Left Trigger*     = B6
    Right Trigger*    = B7
    Two Squares       = B8
    Hamburger         = B9
    Left Thumb Press  = B10
    Right Thumb Press = B11
    Dpad Up           = B12
    Dpad Down         = B13
    Dpad Left         = B14
    Dpad Right        = B15
    Xbox logo         = B16

    *Analog control

    TODO: Axes

 */
(function (flock, fluid) {
    "use strict";

    fluid.defaults("gp2m.tomcat", {
        gradeNames: ["gp2m.eventBroker", "fluid.viewComponent"],
        selectors: {
            output: ".midi-output"
        },
        buttonToMessageTemplate: {
            0:  { channel: 9, note: 36 },
            1:  { channel: 9, note: 38 },
            2:  { channel: 0, note: 24 },
            3:  { channel: 0, note: 28 },
            4:  { channel: 9, note: 42 },
            5:  { channel: 9, note: 44 },
            6:  { channel: 0, note: 32 },
            7:  { channel: 0, note: 36 },
            8:  { channel: 0, note: 40 },
            12: { channel: 0, note: 44 },
            13: { channel: 0, note: 48 },
            14: { channel: 0, note: 52 },
            15: { channel: 0, note: 56 },
            16: { channel: 9, note: 40 }
        },
        // TODO: Look at the wiring and "rules" from the PS4chestra.
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
        },
        invokers: {
            send: {
                funcName: "gp2m.harness.send",
                args: ["{that}", "{arguments}.0"] // payload
            }
        },
        listeners: {
            "onButtonDown.handle": {
                funcName: "gp2m.tomcat.handleButton",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "noteOn"] // buttonValue, buttonIndex, messageType
            },
            "onButtonUp.handle": {
                funcName: "gp2m.tomcat.handleButton",
                args: ["{that}", "{arguments}.0", "{arguments}.1", "noteOff"] // buttonValue, buttonIndex, messageType
            }
        }
    });

    gp2m.tomcat.handleButton = function (that, buttonValue, buttonIndex, messageType) {
        var messageTemplate = fluid.get(that, ["options", "buttonToMessageTemplate", buttonIndex]);
        if (messageTemplate) {
            var velocity = Math.round(buttonValue * 127);
            var message = fluid.extend({}, messageTemplate, { type: messageType, velocity: velocity});
            that.send(message);
        }
    };
})(flock, fluid);
