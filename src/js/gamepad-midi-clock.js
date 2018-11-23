/* globals fluid, flocking */
(function (fluid) {
    "use strict";
    fluid.defaults("gp2m.clock", {
        gradeNames: ["gp2m.harness"],
        rules: {
            onAxisChange: {
                type: { transform: { type: "fluid.transforms.literalValue", input: "clock" } }
            },
            onButtonDown: {
                type: { transform: { type: "fluid.transforms.literalValue", input: "clock" } }
            },
            onButtonUp: {
                type: { transform: { type: "fluid.transforms.literalValue", input: "clock" } }
            }
        },
        components: {
            output: {
                options: {
                    listeners: {
                        "onPortSelected.sendStart": {
                            func: "{gp2m.harness}.send",
                            args: [{ type: "start"}]
                        }
                    }
                }
            }
        }
    });
})(fluid);
