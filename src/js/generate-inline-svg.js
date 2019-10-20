/* eslint-env node */
/*

    Uses the SVG wrapping utility from flocking-midi-interchange to convert our ps4 gamepad image to a namespaced
    javascript file that can be sourced directly from a demo and addressed using CSS and jQuery.

*/
"use strict";
var fluid = require("infusion");
var gp2m = fluid.registerNamespace("gp2m");

require("../../index");
fluid.require("%flocking-midi-interchange/src/js/svg-generator.js");

fluid.defaults("gp2m.svgGenerator", {
    gradeNames: ["flock.midi.interchange.svgJsFileGenerator"],
    inputDirs: ["%gp2m/src/images"],
    outputDir: "%gp2m/dist",
    codeTemplate: "/* globals fluid */\n(function (fluid) {\n\tvar flock = fluid.registerNamespace(\"flock\");\n\tfluid.registerNamespace(\"flock.midi.interchange.svg\");\n\t%name = %payload;\n})(fluid);\n",
    listeners: {
        "onCreate.wrapSvgFiles": {
            funcName: "flock.midi.interchange.wrapSvgFiles",
            args: ["{that}"]
        }
    }
});

gp2m.svgGenerator();
