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
})

/**
 * @param {string} messageText
 * @param {object} data
 */
const rollFromChatMessageOreCommand = async (messageText, data) => {
  let match = messageText.match(new RegExp(`^/ore (.*?)(?:\\s*#\\s*([^]+)?)?$`))
  if (!match) return errorParsingOreCommand(messageText)
  const rollPart = match[1], flavorText = match[2]
  match = rollPart.match(new RegExp(`^([0-9]+)d?(?:10)?\\s*?([0-9]+)?([eEhH])?([1-9]|10)?$`))
  if (!match) return errorParsingOreCommand(messageText)
  const diceCount = match[1]
  let expertCount = 0
  let expertValue = 10
  if (match[3]) {
    if (match[2]) {
      expertCount = match[2]
    } else {
      expertCount = 1
    }
    if (match[4]) {
      expertValue = match[4]
    }
  }
  const normalRoll = await new Roll(`${diceCount}d10`).evaluate()
  const expertRoll = await new Roll(`${expertCount}d${expertValue}`).evaluate({ maximize: true })
  const rollResult = parseRawRoll(normalRoll, expertRoll, flavorText)
  data.content = await getContentFromRollResult(rollResult)
  data.rolls = expertCount > 0 ? [normalRoll, expertRoll] : [normalRoll]
  data.flags = { core: { canPopout: true } }
  return ChatMessage.create(data, {})
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
 * @param normalRolls - a Foundry Roll object that has been rolled
 * @param expertRolls - a Foundry Roll object that has been rolled (even though expert rolls are just maximums)
 * @param {string} flavorText - e.g. "Flaming sword attack"
 * @returns {ORERollResult}
 */
const parseRawRoll = (normalRolls, expertRolls, flavorText) => {
  const rawRolls = normalRolls.terms[0].results.map(r => r.result)
  const rawExpertRolls = expertRolls.terms[0].results.map(r => r.result)
  const counts = new Array(11).fill(0)  // [0, 1, ..., 9, 10].  the 0 is not used
  rawRolls.forEach(k => {
    counts[k] += 1
  })
  rawExpertRolls.forEach(k => {
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
    flavorText,
    sets: Object.entries(sets).map(s => [parseInt(s[0], 10), s[1]]).sort((s1, s2) => s1[0] - s2[0]).map(s => ({
      width: s[1],
      height: s[0],
      rollsInSet: new Array(s[1]).fill(s[0]),
    })),
    looseDice,
  }
}

/**
 * @param {ORERollResult} rollResult
 */
const getContentFromRollResult = async (rollResult) => {
  const { sets, looseDice, flavorText } = rollResult
  return await renderTemplate(`modules/one-roll-engine/templates/ore-roll.html`, {
    sets, looseDice, flavorText,
  })
}

/**
 * Parse [[/ore 7 #laser blast]] inline buttons in text
 */
Hooks.once('init', () => {
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/ore .*?]]/gi,  // captures [[/ore <anything>]]
    enricher: inlineRollButton,
  })
  // activate listeners
  $('body').on('click', 'a.ore-inline-roll', onClickInlineRollButton)
})
/**
 * Text enricher that creates a deferred inline roll button.
 * @param {RegExpMatchArray} match the pattern match for this enricher
 * @param {EnrichmentOptions} _options the options passed to the enrich function
 * @returns {HTMLAnchorElement} the deferred inline roll button
 */
const inlineRollButton = (match, _options) => {
  //const normalDice = parseInt(match[1]);
  //const flavor = match[2]?.slice(1).trim() ?? "";
  const literal = match[0].slice(2, -2) // remove [[ and ]]

  const a = document.createElement('a')
  // add classes
  a.classList.add('ore-inline-roll')
  // add dataset
  a.dataset.literal = literal
  // the text inside
  a.innerHTML = `<i class="fas fa-dice-d10"></i>${literal}`
  return a
}

/**
 *
 * @param {Event} event the browser event that triggered this listener
 */
const onClickInlineRollButton = (event) => {
  event.preventDefault()
  const a = event.currentTarget
  return rollFromChatMessageOreCommand(a.dataset.literal, {})
}

const ORE = {
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