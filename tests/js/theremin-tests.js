(function (fluid, jqUnit) {
    "use strict";

    jqUnit.module("Unit tests for theremin functions.");

    jqUnit.test("Testing gp2m.theremin.getAngle", function () {
        var testDefs = {
            hardRight: {
                message: "Hard right should return 0 degrees.",
                opposite: 0,
                adjacent: 1,
                expected: 0
            },
            equalPos: {
                message: "Positive equal values should return 45 degrees.",
                opposite: .5,
                adjacent: .5,
                expected: 45
            },
            hardUp: {
                message: "Hard up should return 90 degrees.",
                opposite: 1,
                adjacent: 0,
                expected: 90
            },
            oppositePos: {
                message: "Equal values with only the opposite side positive should return 135 degrees.",
                opposite: 1.25,
                adjacent: -1.25,
                expected: 135
            },
            hardLeft: {
                message: "Hard left should return 180 degrees.",
                opposite: 0,
                adjacent: -1,
                expected: 180
            },
            equalNeg: {
                message: "Negative equal values should return 225 degrees.",
                opposite: -.25,
                adjacent: -.25,
                expected: 225
            },
            hardDown: {
                message: "Hard down should return 270 degrees.",
                opposite: -1,
                adjacent: 0,
                expected: 270
            },
            adjacentPos: {
                message: "Equal values with only the adjacent side positive should return 315 degrees.",
                opposite: -.75,
                adjacent: .75,
                expected: 315
            },
            bothZeros: {
                message: "We should be able to handle zeroes in both positions.",
                opposite: 0,
                adjacent: 0,
                expected: 0
            }
        };

        fluid.each(testDefs, function (testDef) {
            var output = gp2m.theremin.getAngle(testDef.opposite, testDef.adjacent)
            jqUnit.assertEquals(testDef.message, testDef.expected, output);
        });
    })
})(fluid, jqUnit);
