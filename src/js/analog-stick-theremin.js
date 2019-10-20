/* globals fluid, flocking */
(function (fluid) {
    "use strict";

    fluid.registerNamespace("gp2m.theremin");

    // TODO: Write unit tests to ensure this works over the whole range of values for each
    gp2m.theremin.getAngle = function (opposite, adjacent) {
        if (opposite === 0 && adjacent === 0) {
            return 0;
        }
        else {
            var radians = Math.atan2(opposite, adjacent);
            return (360 + (radians * (180/Math.PI))) % 360;
        }
    };

    gp2m.theremin.getRadius = function (x, y) {
        return Math.sqrt((y*y) + (x*x));
    };

    gp2m.theremin.offsetPerGamepad = function (axisIndex, gamepadIndex) {
        return (gamepadIndex * 10) + axisIndex;
    };

    gp2m.theremin.boundedValue = function (rawValue, lowestAllowed, highestAllowed) {
        if (rawValue < lowestAllowed) {
            return 0;
        }
        else if (rawValue > highestAllowed) {
            return highestAllowed;
        }
        else {
            return rawValue;
        }
    };

    /**
     *
     * Respond to an axis change by firing two control signals, one for the angle of deflection, one for the radius
     * (amount of deflection from the resting state).
     *
     * @param {Object} that - The theremin harness component.
     * @param {Integer} axisValue - The value of the axis.
     * @param {Integer} axisIndex - The index of the axis.
     * @param {Integer} gamepadIndex - The index of the gamepad.
     *
     */
    gp2m.theremin.handleAxisChange = function (that, axisValue, axisIndex, gamepadIndex) {
        // Which axis are we, x or y?
        var isVerticalAxis = axisIndex % 2;

        // What's our companion axis index and value?
        var companionAxis = isVerticalAxis ? axisIndex - 1 : axisIndex + 1;
        var companionValue = fluid.get(that.model.gamepads, [gamepadIndex, "axes", companionAxis]) || 0;

        var xAxisIndex = isVerticalAxis ? companionAxis : axisIndex;
        var yAxisIndex = isVerticalAxis ? axisIndex : companionAxis;

        var xValue = isVerticalAxis ? companionValue : axisValue;

        var yValue = isVerticalAxis ? axisValue : companionValue;

        // Calculate the radius and send as one control code with the number equal to the y axis index.
        var radius = gp2m.theremin.getRadius(xValue, yValue);
        var radiusValue = gp2m.theremin.boundedValue(Math.round(radius * 127), 20, 127);
        var radiusPayload = {
            type: "control",
            channel: that.model.midiChannel,
            number: gp2m.theremin.offsetPerGamepad(yAxisIndex, gamepadIndex),
            value:  radiusValue
        };
        that.send(radiusPayload);

        // Calculate the angle and send as another control code with the number equal to the x axis index.
        var angle  = gp2m.theremin.getAngle(yValue, xValue);
        var angleValue = Math.round((angle/360) * that.options.angleScaling )+ that.options.angleBaseValue;
        var anglePayload = {
            type: "control",
            channel: that.model.midiChannel,
            number: gp2m.theremin.offsetPerGamepad(xAxisIndex, gamepadIndex),
            value:  angleValue
        };
        that.send(anglePayload);
    };

    fluid.defaults("gp2m.theremin", {
        gradeNames: ["gp2m.harness"],
        // that.options.angleScaling )+ that.options.angleBaseValue
        angleScaling: 24, // two octaves
        angleBaseValue: 36, // C2
        listeners: {
            "onAxisChange.handleAxisChange": {
                funcName: "gp2m.theremin.handleAxisChange",
                args:     ["{that}", "{arguments}.0", "@expand:parseInt({arguments}.1, 10)", "{arguments}.2"] // axisValue, axisIndex, gamepadIndex

            }
        }
    });
})(fluid);
