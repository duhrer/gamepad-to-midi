/* globals fluid, flocking */
(function (fluid) {
    "use strict";
    fluid.defaults("gp2m.theremin", {
        gradeNames: ["gp2m.harness"],
        rules: {
            onAxisChange: {
                type: { transform: { type: "fluid.transforms.literalValue", input: "control" } },
                channel: "model.midiChannel",
                number: "arguments.1", // axis change sends: axisValue, axisIndex (what we want), gamepadIndex
                value: {
                    "transform": {
                        "type": "fluid.transforms.round",
                        "input": {
                            transform: {
                                type: "fluid.transforms.binaryOp",
                                "left": {
                                    transform: {
                                        type: "fluid.transforms.binaryOp",
                                        leftPath: "arguments.0",
                                        right: {
                                            transform: {
                                                type: "fluid.transforms.valueMapper",
                                                defaultInputPath: "arguments.1",
                                                match: {
                                                    1: -24,
                                                    3: -127
                                                }
                                            }
                                        },
                                        operator: "*"
                                    }
                                },
                                "right": {
                                    transform: {
                                        type: "fluid.transforms.valueMapper",
                                        defaultInputPath: "arguments.1",
                                        match: {
                                            1: 84,
                                            3: 0
                                        }
                                    }
                                },
                                "operator": "+"
                            }
                        }
                    }
                }
            }
        }
    });
})(fluid);
