# Gamepad to MIDI

![Gamepad to MIDI logo](./src/images/g2m-logo.svg)

## Introduction

This library uses the [HTML5 gamepad API](https://www.w3.org/TR/gamepad/) to convert gamepad inputs to MIDI messages.

When a gamepad button is pressed, a "noteOn" message is sent to a connected MIDI output, by default on MIDI Channel 1.
When a button is released, the corresponding "noteOff" message is sent.  Button 0 is mapped to middle C (note 60),
button 1 to C# above middle C, button 2 to D above middle C, et cetera, up to button 14, which is an octave above
button 2.

The analog sticks send pitchbend messages on the same MIDI Channel.  Moving either analog stick up will raise
the pitch, and moving the stick down will lower the pitch.

## Requirements

### This Package

You will need to clone (or fork and clone a copy of) this repository, then install the required dependencies using
[`npm`](https://www.npmjs.com).  Usually you'll want to use the command `npm install`.

### Browser

You will need a browser that [supports the gamepad API](https://caniuse.com/#search=gamepad).

### Controller

Although I am primarily testing this Xbox controllers such as the [Xbox Adaptive
Controller](https://www.xbox.com/en-US/xbox-one/accessories/controllers/xbox-adaptive-controller), this package should
work with any controller that works with the gamepad API.

## Usage

Once you have installed the requirements and connected your controller, open the `index.html` demo file in the root of
your copy of the repository with a browser that supports the gamepad API.  You will see an interface that allows you to
select a MIDI output.  Once you have selected a MIDI output, press buttons on your gamepad to play notes.  Button 0
plays Middle C, and the note played goes up by one note per button.

For a helpful guide to the location of each button, refer to [this diagram in the W3C working
draft](https://www.w3.org/TR/gamepad/#remapping).

## Credits

This package uses numerous libraries, most notably:

1. [Infusion](http://docs.fluidproject.org/infusion), which provides core mechanisms such as event handling, mapping
   buttons to notes, transforming analog stick inputs into pitchbend values, and much more.
2. [Flocking](http://flockingjs.org), which handles connecting to and communicating with a MIDI output.
3. [Bergson](https://github.com/colinbdclark/bergson), which I use to handle polling the gamepad to check the state of
   its inputs.

Thanks to the authors of and contributors to each of these.  Thanks also to the team that maintain the [XBOX 360
controller driver for OS X](https://github.com/360Controller/360Controller).
