# [One Roll Engine](https://foundryvtt.com/packages/one-roll-engine/)

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/itamarcu/one-roll-engine?style=for-the-badge) 
![GitHub Releases](https://img.shields.io/github/downloads/itamarcu/one-roll-engine/latest/total?style=for-the-badge) 
![GitHub All Releases](https://img.shields.io/github/downloads/itamarcu/one-roll-engine/total?style=for-the-badge&label=Downloads+total)  
![Latest Supported Foundry Version](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/itamarcu/one-roll-engine/raw/master/module.json)

## NOTE: This is a fork made specifically for yoshifanx:
 This fork adds flavor post-text (text displayed after the roll), the ability to reference actor attributes when rolling in chat, and support for wiggle dice. There will also be a couple of sample macros included. This was made under the MIT license.

<hr>

One Roll Engine is a Foundry VTT module, based on the [One-Roll Engine](https://en.wikipedia.org/wiki/One-Roll_Engine) (O.R.E) 
generic TTRPG system.  This basic system is used for games such as Wild Talents, Monsters and Other Childish Things, 
and The Velvet Book. 

#### [Changelog](https://github.com/itamarcu/one-roll-engine/blob/master/Changelog.md)

# Features

## Basic command: `/ore`
Use the `/ore` command to roll a number of dice (d10s, ten-sided dice with the numbers from 1 to 10).  You can type any
of the following, to roll 7 dice:
> `/ore 7d10`

> `/ore 7d`

> `/ore 7`

> `/ore 7 #electric dash attack!`

They will all result in the same thing - a chat message that includes the result of the roll, with dice grouped up to
sets.

Any text written after the `#`, "flavor text", will also be included.

![screenshot 2](https://raw.githubusercontent.com/itamarcu/one-roll-engine/master/metadata/screenshot_2_electric_dash_attack.png)

### Sets

The dice shown on the left are the "sets" you rolled.  Sets include two or more dice with the same value.  A set's 
"height" is that value, while a set's "width" is the amount of dice.  For example, rolling a pair of tens is a "2x10",
which has width 2 and height 10.

Visually, the dice in the sets will be shown in a column of identical-value dice.

Sets can be clicked to select/outline them (visible only to you).

### Loose Dice

The dice shown on the right - which are smaller and uncolored - are the "loose dice".

Loose dice can be clicked to select/outline them (visible only to you).

Loose dice can be alt-clicked to
make them go down, by 1 each time, until it goes below 1 and returns to its original value.

![screenshot 3](https://raw.githubusercontent.com/itamarcu/one-roll-engine/master/metadata/screenshot_3_selections.png)


### Expert/Hard Dice

Expert/hard dice can be added using the syntax /ore 5d 1e6.

The 'e' can be replaced with 'E', 'h', or 'H'. If you don't put in the first number (e.g. /ore 5d e1) then the number of dice will default to 1. If you don't put in the second number (e.g. /ore 5d 1e), then the dice will default to 10.

The expert/hard dice will be added to the normal roll, becoming part of sets or loose dice as normal.

## License

The One Roll Engine is published by Greg Stolze (http://gregstolze.com/) and licensed under Creative Commons Attribution-Share Alike 2.0.
