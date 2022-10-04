export const MODULE_NAME = 'one-roll-engine'

const HOOK_CLICK_SET = 'one-roll-engine clickSet'
const HOOK_CLICK_LOOSE_DIE = 'one-roll-engine clickLooseDie'


/*
 * Parse and roll dice when users type `/ore 6d10` and similar syntax
 */
Hooks.on('chatMessage', (_, messageText, data) => {
  if (messageText !== undefined && messageText.startsWith(`/ore`)) {
    rollFromChatMessageOreCommand(messageText, data)
    return false
  } else {
    return true
  }
})

/*
 * Toggle dashed outline of sets, when clicked
 */
Hooks.on('renderChatLog', () => {
  const chatLog = $('#chat-log')
  chatLog.on('click', '.ore-set-roll', (event) => {
    event.preventDefault()
    const setsDiv = event.currentTarget
    if (event.ctrlKey || event.shiftKey) {
      const hookCallAnswer = Hooks.call(HOOK_CLICK_SET, event)
      if (hookCallAnswer === false) return
    }
    setsDiv.style.outline = setsDiv.style.outline === 'dashed' ? 'none' : 'dashed'
  })
  chatLog.on('click', '.ore-single-roll.loose', (event) => {
    event.preventDefault()
    const looseDieDiv = event.currentTarget
    if (event.ctrlKey || event.shiftKey) {
      const hookCallAnswer = Hooks.call(HOOK_CLICK_LOOSE_DIE, event)
      if (hookCallAnswer === false) return
    }
    if (event.altKey) {
      const startingValue = parseInt(looseDieDiv.dataset.value)
      const currentValue = parseInt(looseDieDiv.style.backgroundImage.match(/(\d+)\.png/)[1])
      let newValue = currentValue - 1
      if (newValue === 0) newValue = `loose_${startingValue}`
      looseDieDiv.style.backgroundImage = `url("modules/one-roll-engine/images/dice/d10_${newValue}.png")`
    } else {
      looseDieDiv.style.outline = looseDieDiv.style.outline === 'dashed' ? 'none' : 'dashed'
    }
  })
  chatLog.on('click', '.ore-wiggle-apply', (event) => {
    event.preventDefault();
    const chatMessageElement = event.currentTarget.closest(".chat-message");
    const wiggleDieValue = event.currentTarget.parentElement.querySelector("select[name='wiggleDie']").value;

    // Add wiggle die to existing div
    const oreSetMatch = chatMessageElement.querySelector(`.ore-set-roll[data-height='${wiggleDieValue}']`); // Does this roll have a set that matches our wiggle die?
    const oreLooseDiceDiv = chatMessageElement.querySelector(".ore-loose-dice"); // Identify loose dice div.
    const oreLooseMatch = oreLooseDiceDiv.querySelector(`.loose[data-value='${wiggleDieValue}']`); // Which loose dice child matches our wiggle die?
    if (oreSetMatch) { // If the wiggle die matches a set.
      const dieImageElement = chatMessageElement.querySelector(`.in-set[data-value='${wiggleDieValue}']`); // Find the image element that matches our wiggle die.
      const clone = dieImageElement.cloneNode(true); // Clone it
      dieImageElement.after(clone); // Add it
    } else if (oreLooseMatch) { // If the wiggle die matches a loose die.
        let newDiv = ""; // Define the html we want to insert.
          newDiv += `<div class="ore-set-roll" data-width="2" data-height="${wiggleDieValue}">`;
          newDiv += `  <div class="ore-single-roll in-set" data-value="${wiggleDieValue}"`;
          newDiv += `     style="background-image: url('modules/one-roll-engine/images/dice/d10_${wiggleDieValue}.png')">`;
          newDiv += `  </div>`;
          newDiv += `<div>`;
        const setsDiv = chatMessageElement.querySelector(".ore-sets"); // Identify the sets div so that we can put new stuff in it.
        newDiv = new DOMParser().parseFromString(newDiv, "text/html").body.firstElementChild; // Convert newDiv html string to DOM.
        setsDiv.append(newDiv); // Add new image to sets.

        // Duplicate the image since the set will by definition have two (we are adding to an existing loose die).
        const inSetDiv = newDiv.querySelector(".in-set");
        const clone = inSetDiv.cloneNode(true);
        inSetDiv.after(clone);
        oreLooseMatch.remove();
    } else { // If the wiggle die matches nothing.
      let newDiv = "";
        newDiv += `<div class="ore-single-roll loose" data-value="${wiggleDieValue}"`;
        newDiv += `   style="background-image: url('modules/one-roll-engine/images/dice/d10_loose_${wiggleDieValue}.png')">`;
        newDiv += `</div>`;

      newDiv = new DOMParser().parseFromString(newDiv, "text/html").body.firstElementChild; // Convert newDiv html string to DOM.
      oreLooseDiceDiv.append(newDiv);
    }
    

    // Handle subtracting current wiggle die every time apply button is clicked.
    let wiggleDieCurrent = event.currentTarget.parentElement.querySelector("span[data-id='wiggleDieCurrent']");
    const updatedWiggleDie = parseInt(wiggleDieCurrent.innerHTML, 10) - 1;
    wiggleDieCurrent.innerHTML = updatedWiggleDie;
    if (updatedWiggleDie <= 0) {
      ui.notifications.notify("All wiggle dice applied");
    }

    // Update the chat message so that these changes persist
    const chatMessageElementContent = chatMessageElement.querySelector(".one-roll-engine-dice-roll").outerHTML;
    const chatMessageId = chatMessageElement.attributes[1].value;
    const chatMessage = game.messages.get(chatMessageId);
    chatMessage.update({ content: chatMessageElementContent });
  });
})

/**
 * @param {string} messageText
 * @param {object} data
 */
const rollFromChatMessageOreCommand = async (messageText, data) => {
  const chatStartRegEx = new RegExp(`^/ore (.*?)(?:\\s*#\\s*([^]+)?)?$`);
  let match = messageText.match(chatStartRegEx);
  if (!match) return errorParsingOreCommand(messageText);
  const rollPart = match[1], flavorText = match[2];
  
  const flavorTextRegEx = new RegExp('^(.*?)(?:\\s*%\\s*([^]+)?)?$');
  match = flavorText?.match(flavorTextRegEx);
  let flavorPreText, flavorPostText;
  if (match) {
    flavorPreText = match[1];
    flavorPostText = match[2];
  }

  const mainRollRegEx = new RegExp(`^(?:\{@([^}]+)\}|([0-9]+))(?:d?1?0?\s*)(.*)$`);
  match = rollPart.match(mainRollRegEx);
  if (!match) return errorParsingOreCommand(messageText);

  let actorAttribute;
  if (match[1]) {
    const controlledTokens = canvas.tokens.controlled;
      if (controlledTokens.length != 1) {
        return ui.notifications.warn("Select ONE token only");
      }
    actorAttribute = controlledTokens[0].actor.data.data.attributes[match[1]].value;
  }
  const diceCount = actorAttribute || match[2];

  const expertWigglePart = match[3];
  const expertWigglePartRegEx = new RegExp(`^(?:\{@([^}]+)\}|([0-9]+))?([eEhH])?([1-9|10]+)?\s*?(.*)$`);
  match = expertWigglePart.trimStart().match(expertWigglePartRegEx);
  if (!match) return errorParsingOreCommand(messageText);

  let expertCount = 0;
  let expertValue = 10;
  if (match[3]) {
    if (match[1]) {
      const controlledTokens = canvas.tokens.controlled;
      if (controlledTokens.length != 1) {
        return ui.notifications.warn("Select ONE token only");
      }
      expertCount = controlledTokens[0].actor.data.data.attributes[match[1]].value;    
    } else if (match[2]) {
      expertCount = match[2];
    } else {
      expertCount = 1;
    }
    if (match[4]) {
      expertValue = match[4];
    }
  }

  const wigglePart = match[5];
  const wigglePartRegEx = new RegExp(`^(?:\{@([^}]+)\}|([0-9]+))?([wW])?$`);
  match = wigglePart.trimStart().match(wigglePartRegEx);
  if (!match) return errorParsingOreCommand(messageText);
  
  let wiggleDie = 0;
  if (match[3]){
    if (match[1]) {
      const controlledTokens = canvas.tokens.controlled;
        if (controlledTokens.length != 1) {
          return ui.notifications.warn("Select ONE token only");
        }
      wiggleDie = controlledTokens[0].actor.data.data.attributes[match[1]].value;
    } else {
      wiggleDie = match[2];
    }
  }

  const roll = createRawRoll(diceCount);
  const rollResult = parseRawRoll(roll, expertCount, expertValue, wiggleDie, flavorPreText, flavorPostText);
  data.content = await getContentFromRollResult(rollResult);
  data.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
  data.roll = roll;
  data.flags = { core: { canPopout: true } };
  return ChatMessage.create(data, {});
}


const errorParsingOreCommand = (messageText) => {
  ui.notifications.error(
    `<div>Failed parsing your command:</div>
    <div><p style="font-family: monospace">${messageText}</p></div>
    <div>Try instead: <p style="font-family: monospace">/ore 7d 6e9 #blah</p></div>`,
  )
  return null
}

/**
 * returns a Foundry Roll object.
 *
 * To get the array of results:
 *
 * roll.terms[0].results.map(r => r.result)    will returns an array, e.g. [2, 10, 5, 6, 5, 5, 3, 1, 1, 8]
 *
 * @param {number} diceCount
 */
const createRawRoll = (diceCount) => {
  return new Roll(`${diceCount}d10`).roll({ async: false })
}

/**
 * @typedef ORESet
 * @type {object}
 * @property {number} width - e.g. 3
 * @property {height} width - e.g. 2
 * @property {number[]} rollsInSet - e.g. [2, 2, 2]
 */

/**
 * @typedef ORERollResult
 * @type {object}
 * @property {number[]} rawRolls - e.g. [1, 2, 4, 2, 10, 2, 1]
 * @property {string} flavorText - e.g. "Flaming sword attack"
 * @property {ORESet[]} sets - e.g. [{width: 3, height: 2, rollsInSet: [2, 2, 2]}, {width: 2, height: 1, rollsInSet: [1, 1]}]
 * @property {number[]} looseDice - e.g. [4, 10]
 */

/**
 * @param roll - a Foundry Roll object that has been rolled
 * @param {string} flavorText - e.g. "Flaming sword attack"
 * @returns {ORERollResult}
 */
const parseRawRoll = (roll, expertCount, expertValue, wiggleDie, flavorPreText, flavorPostText) => {
  const rawRolls = roll.terms[0].results.map(r => r.result)
  const expertRolls = new Roll(`${expertCount}d${expertValue}`).roll({ async: false, maximize: true }).terms[0].results.map(r => r.result)
  const counts = new Array(11).fill(0)  // [0, 1, ..., 9, 10].  the 0 is not used
  rawRolls.forEach(k => {
    counts[k] += 1
  })
  expertRolls.forEach(k => {
    counts[k] += 1
  })
  const sets = {}  // key = height, value = width
  const looseDice = []
  counts.forEach((count, num) => {
    if (count === 0) return  // (will also skip the "0" count)
    if (count === 1) looseDice.push(num)
    if (count >= 2) sets[num] = count
  })
  return {
    rawRolls,
    flavorPreText,
    flavorPostText,
    sets: Object.entries(sets)
      .map(s => [parseInt(s[0], 10), s[1]])
      .sort((s1, s2) => s1[0] - s2[0])
      .map(s => ({
        width: s[1],
        height: s[0],
        rollsInSet: new Array(s[1]).fill(s[0]),
      })),
    looseDice,
    wiggleDie,
  }
}

/**
 * @param {ORERollResult} rollResult
 */
const getContentFromRollResult = async (rollResult) => {
  const { sets, looseDice, wiggleDie, flavorPreText, flavorPostText } = rollResult
  return await renderTemplate(`modules/one-roll-engine/templates/ore-roll.html`, {
    sets, looseDice, wiggleDie, flavorPreText, flavorPostText,
  })
}

const ORE = {
  createRawRoll,
  parseRawRoll,
  getContentFromRollResult,
  hooks: {
    HOOK_CLICK_SET,
    HOOK_CLICK_LOOSE_DIE,
  },
}

Hooks.on('init', () => {
  game.oneRollEngine = ORE
  // if you're reading this code and planning to use this module in macros/systems - I suggest doing:
  //
  //     const ORE = game.oneRollEngine
  console.log(`${MODULE_NAME} | Initialized.`)
})