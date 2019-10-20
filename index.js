/* eslint-env node */
// Register our content so it can be used with calls like fluid.module.resolvePath("%gp2m/path/to/content.js");
"use strict";
var fluid = require("infusion");

fluid.module.register("gp2m", __dirname, require);
