import { getUserById } from '../database/user.js';
import { getAllUserPokemon, getUserLeadPokemon } from '../database/pokemon.js';
import { getActivePool } from '../database/pool.js';
import { itemDropRate, maxEncounters, maxNewEncounters } from '../config.js';
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';
import showdown from 'pokemon-showdown';
import tierData from '../data/tierPropabilities.json' with { type: 'json' };
import pokemonData from '../data/pokemon.json' with { type: 'json' };
import droppableItems from '../data/items/dropItems.json' with { type: 'json' };
import { generateBattleImage } from './imageGenerator.js';
import { sendMessage } from './sendMessage.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { awaitInteraction } from './componentManager.js';
import { getAllItemsForUser } from '../database/item.js';

const activeBattles = {};

const trainerID = 'p1';
const botID = 'p2';

async function getRandomEncounterForPlayer(user) {
  const userPokemon = await getAllUserPokemon(user.discordId);
  const userPokemonNames = userPokemon.map((pokemon) => pokemon.name);

  const availablePokemon = [];

  const userTierData = tierData[user.badges];

  const randomNumber = Math.random();
  let randomTier = 'ZU';

  for (const tier of Object.keys(userTierData)) {
    if (userTierData[tier] >= randomNumber) {
      randomTier = tier;
      break;
    }
  }

  const activePool = await getActivePool();

  for (const pokemon of Object.keys(pokemonData)) {
    if (
      user.newEncounters < maxNewEncounters &&
      user.encounters < maxEncounters
    ) {
      if (
        pokemonData[pokemon].tier === randomTier &&
        pokemonData[pokemon].types.includes(activePool.type)
      ) {
        availablePokemon.push(pokemon);
        if (!userPokemonNames.includes(pokemonData[pokemon].name)) {
          availablePokemon.push(pokemon);
          availablePokemon.push(pokemon);
          availablePokemon.push(pokemon);
          availablePokemon.push(pokemon);
        }
      }
    } else {
      if (
        pokemonData[pokemon].tier === randomTier &&
        pokemonData[pokemon].types.includes(activePool.type) &&
        userPokemonNames.includes(pokemonData[pokemon].name)
      ) {
        availablePokemon.push(pokemon);
      }
    }
  }
  if (availablePokemon.length === 0) {
    return await getRandomEncounterForPlayer(user);
  }
  const randomPokemon =
    availablePokemon[Math.floor(availablePokemon.length * Math.random())];
  if (userPokemonNames.includes(pokemonData[randomPokemon].name)) {
    return {
      new: false,
      pokemon: randomPokemon,
    };
  }
  return {
    new: true,
    pokemon: randomPokemon,
  };
}

async function getRandomSetForPokemon(pokemon) {
  const randomPokemonData = pokemonData[pokemon];
  const sets = randomPokemonData.sets;
  const set = sets[Math.floor(Math.random() * sets.length)];
  set['name'] = '';
  set['species'] = randomPokemonData.name;
  set['ivs'] = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
  set['level'] = 100;
  set['happiness'] = 255;
  set['shiny'] = Math.floor(Math.random() * 4069) === 187;
  // TODO: check with shiny pin
  return set;
}

async function botChooseHighestDamageMove(battle) {
  const attackerShowdown = battle.p2.active[0];
  const defenderShowdown = battle.p1.active[0];
  const gen = Generations.get(battle.gen);
  const attacker = formatForCalc(attackerShowdown);
  const defender = formatForCalc(defenderShowdown);
  const moves = attackerShowdown.moveSlots;
  let bestMoveIndex = 0;
  let maxDamage = -1;
  if (attackerShowdown.volatiles.twoturnmove) {
    battle.choose(botID, 'move 1');
    return;
  }
  moves.forEach((moveSlot, i) => {
    if (moveSlot.pp === 0 || moveSlot.disabled) {
      return;
    }

    const moveName = moveSlot.move;
    const move = new Move(gen, moveName);
    const field = new Field({
      weather: attackerShowdown.battle.field.weather || undefined,
      terrain: attackerShowdown.battle.field.terrain || undefined,
      defenderSide: {
        reflect: defenderShowdown.volatiles['reflect']?.active || false,
        lightScreen: defenderShowdown.volatiles['lightscreen']?.active || false,
        auroraVeil: defenderShowdown.volatiles['auroraveil']?.active || false,
      },
      attackerSide: {
        helpingHand: attackerShowdown.volatiles['helpinghand']?.active || false,
      },
    });
    const result = calculate(gen, attacker, defender, move, field);
    const possibleDamage = result.damage;

    if (possibleDamage && possibleDamage.length > 0) {
      const currentMaxDamage = Math.max(...possibleDamage);
      if (currentMaxDamage > maxDamage) {
        maxDamage = currentMaxDamage;
        bestMoveIndex = i;
      }
    }
  });
  if (attackerShowdown.canMegaEvo) {
    battle.choose(botID, `move ${bestMoveIndex + 1} mega`);
    return;
  }
  battle.choose(botID, `move ${bestMoveIndex + 1}`);
}

function formatForCalc(pokemon) {
  const set = pokemon.set;
  const evs = set?.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const ivs = set?.ivs || {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
  };
  const nature = set?.nature || 'Serious';

  return new Pokemon(pokemon.battle.gen, set.species, {
    level: pokemon.level,
    ability: pokemon.ability,
    item: set?.item,
    nature: nature,
    evs: evs,
    ivs: ivs,
    boosts: pokemon.boosts,
    gender:
      pokemon.gender === 'M' ? 'M' : pokemon.gender === 'F' ? 'F' : undefined,
    hp: pokemon.hp,
    maxhp: pokemon.maxhp,
  });
}

function generateMovesButtons(pokemon) {
  const moves = [];
  pokemon.moveSlots.forEach((moveSlot, index) => {
    if (pokemon.volatiles.twoturnmove) {
      if (pokemon.volatiles.twoturnmove.move === moveSlot.id) {
        moves.push(
          new ButtonBuilder()
            .setCustomId(String(1))
            .setLabel(moveSlot.move)
            .setStyle(ButtonStyle.Primary)
        );
      }
    } else if (pokemon.volatiles.lockedmove) {
      if (pokemon.volatiles.lockedmove.move === moveSlot.id) {
        moves.push(
          new ButtonBuilder()
            .setCustomId(String(1))
            .setLabel(moveSlot.move)
            .setStyle(ButtonStyle.Primary)
        );
      }
    } else if (pokemon.volatiles.choicelock) {
      if (pokemon.volatiles.choicelock.move === moveSlot.id) {
        moves.push(
          new ButtonBuilder()
            .setCustomId(String(index + 1))
            .setLabel(moveSlot.move)
            .setStyle(ButtonStyle.Primary)
        );
      }
    } else if (moveSlot.pp > 0) {
      moves.push(
        new ButtonBuilder()
          .setCustomId(String(index + 1))
          .setLabel(moveSlot.move)
          .setStyle(ButtonStyle.Primary)
      );
    }
  });
  moves.push(
    new ButtonBuilder()
      .setCustomId('ff')
      .setLabel('Aufgeben')
      .setStyle(ButtonStyle.Danger)
  );
  return moves;
}

function generateRoundLog(log) {
  const turnIds = [];
  const sortedMoveLog = [];
  let turnNum = 1;

  while (log.includes(`|turn|${turnNum}`)) {
    turnIds.push(log.indexOf(`|turn|${turnNum}`));
    turnNum += 1;
  }

  let moveLog = '';

  if (turnIds.length == 1 && !log[log.length - 1].startsWith('|win|')) {
    return moveLog;
  }

  if (log[log.length - 1].startsWith('|win|')) {
    turnIds.push(log.length);
  }

  let moveStrs = [];

  for (
    let x = turnIds[turnIds.length - 2];
    x < turnIds[turnIds.length - 1];
    x++
  ) {
    if (log[x].startsWith('|move|')) {
      sortedMoveLog.push(moveStrs);
      moveStrs = [];
    }
    moveStrs.push(log[x]);
  }
  sortedMoveLog.push(moveStrs);
  sortedMoveLog.shift();

  for (const rawMoveLog of sortedMoveLog) {
    moveLog += convertMoveLogToString(rawMoveLog);
  }

  return moveLog;
}

function convertMoveLogToString(log) {
  const trainerNames = {
    p1a: 'Your',
    p2a: 'Wild',
  };
  let moveLog = `${trainerNames[log[0].split('|')[2].split(': ')[0]]} ${log[0].split('|')[2].split(': ')[1]} used ${log[0].split('|')[3]} against ${trainerNames[log[0].split('|')[4].split(': ')[0]]} ${log[0].split('|')[4].split(': ')[1]}.\n`;
  if (
    log[0].split('|')[4].split(': ')[0] === '' ||
    log[0].split('|')[4].split(': ')[0] === log[0].split('|')[2].split(': ')[0]
  ) {
    moveLog = `${trainerNames[log[0].split('|')[2].split(': ')[0]]} ${log[0].split('|')[2].split(': ')[1]} used ${log[0].split('|')[3]}.\n`;
  }
  if (log[1].startsWith('|-fail|')) {
    return moveLog + 'Failed.\n';
  }
  if (log[1].startsWith('|-miss|')) {
    return moveLog + 'Missed.\n';
  }
  if (log[1].startsWith('|-prepare|')) {
    return moveLog + 'Preparing...\n';
  }
  if (log[1].startsWith('|-crit|')) {
    moveLog += 'It was a critical hit.\n';
  }
  if (log[1].startsWith('|-boost|')) {
    moveLog += `${trainerNames[log[1].split('|')[2].split(': ')[0]]} ${log[1].split('|')[2].split(': ')[1]} has boosted itself.\n`;
  }
  if (log[1].startsWith('|-supereffective')) {
    moveLog += 'It was super effective.\n';
  }
  if (log[1].startsWith('|-resisted')) {
    moveLog += 'It was not very effective.\n';
  }

  if (log.lenght > 3 && log[log.length - 3].startsWith('|faint|')) {
    moveLog += `${trainerNames[log[log.length - 3].split('|')[2].split(': ')[0]]} ${log[log.length - 3].split('|')[2].split(': ')[1]} fainted.\n`;
  }

  return moveLog;
}

export async function startNewBattle(userId) {
  const user = await getUserById(userId);
  if (activeBattles[userId]) {
    return false;
  }
  const userLead = await getUserLeadPokemon(user.name);
  const trainerPokemon = showdown.Teams.import(userLead.pokepaste);
  const wildEncounter = await getRandomEncounterForPlayer(user);

  if (!wildEncounter) {
    return false;
  }

  const wildSet = await getRandomSetForPokemon(wildEncounter.pokemon);

  const battle = new showdown.Battle({ formatid: 'gen7customgame' });

  battle.setPlayer(trainerID, { name: 'Trainer', team: trainerPokemon });
  battle.setPlayer(botID, { name: 'Wild', team: [wildSet] });

  battle.choose(trainerID, 'team 1');
  battle.choose(botID, 'team 1');

  const encounter = {
    set: wildSet,
    new: wildEncounter.new,
  };

  activeBattles[userId] = {
    encounter: encounter,
    battle: battle,
  };
  return true;
}

export async function runBattle(userId, interaction) {
  if (!activeBattles[userId]) {
    return false;
  }
  const battle = activeBattles[userId].battle;

  const trainerPokemon = battle.p1.active[0];
  const wildPokemon = battle.p2.active[0];

  const battleImageBuffer = await generateBattleImage(
    trainerPokemon,
    wildPokemon
  );

  const log = generateRoundLog(battle.log);
  let logString = `Item: ${trainerPokemon.set.item}`;
  if (log !== '') {
    logString = log;
  }

  if (!battle.ended) {
    const moves = generateMovesButtons(trainerPokemon);

    const actionRow = new ActionRowBuilder().addComponents(moves);

    const message = await sendMessage(
      {
        image: battleImageBuffer,
        title: `${trainerPokemon.species.name}${trainerPokemon.set.shiny ? ' ⭐' : ''} vs. ${wildPokemon.species.name}${wildPokemon.set.shiny ? ' ⭐' : ''}`,
        description: logString,
        noSprite: true,
      },
      interaction,
      [actionRow]
    );

    const response = await awaitInteraction(userId, message);

    if (response === 'ff') {
      const encounter = activeBattles[userId].encounter;
      encounter.winner = false;
      delete activeBattles[userId];
      return encounter;
    }

    battle.choose(
      trainerID,
      `move ${response}${trainerPokemon.canMegaEvo ? ' mega' : ''}`
    );
    await botChooseHighestDamageMove(battle);
    return await runBattle(userId, interaction);
  }

  await sendMessage(
    {
      image: battleImageBuffer,
      title: `${trainerPokemon.species.name}${trainerPokemon.set.shiny ? ' ⭐' : ''} vs. ${wildPokemon.species.name}${wildPokemon.set.shiny ? ' ⭐' : ''}`,
      description: logString,
      noSprite: true,
    },
    interaction
  );
  const encounter = activeBattles[userId].encounter;
  encounter.winner = battle.winner === 'Trainer';
  delete activeBattles[userId];
  return encounter;
}

export async function calculateLoot(pokemonName, userId, mega) {
  const loot = {};

  const tier = pokemonData[pokemonName.toLowerCase()].tier;

  const randomFactor = -20 + Math.floor(Math.random() * 41);

  switch (tier) {
    case 'ZU': {
      loot.money = 100 + randomFactor;
      break;
    }
    case 'ZUBL': {
      loot.money = 150 + randomFactor;
      break;
    }
    case 'PU': {
      loot.money = 200 + randomFactor;
      break;
    }
    case 'PUBL': {
      loot.money = 200 + randomFactor;
      break;
    }
    case 'NU': {
      loot.money = 250 + randomFactor;
      break;
    }
    case 'NUBL': {
      loot.money = 300 + randomFactor;
      break;
    }
    case 'RU': {
      loot.money = 350 + randomFactor;
      break;
    }
    case 'RUBL': {
      loot.money = 400 + randomFactor;
      break;
    }
    case 'UU': {
      loot.money = 450 + randomFactor;
      break;
    }
    case 'UUBL': {
      loot.money = 500 + randomFactor;
      break;
    }
    case 'OU': {
      loot.money = 600 + randomFactor;
      break;
    }
    case 'Uber': {
      loot.money = 1000 + randomFactor;
      break;
    }
    default: {
      loot.money = 50 + randomFactor;
    }
  }

  if (Math.random() < itemDropRate) {
    const userItems = await getAllItemsForUser(userId);
    const userItemNames = userItems.map((item) => item.name);
    const validItems = Object.keys(droppableItems).filter((item) => {
      return !userItemNames.includes(item);
    });
    if (validItems.length == 0) {
      return loot;
    }
    const randomItem =
      validItems[Math.floor(Math.random() * validItems.length)];
    loot.item = droppableItems[randomItem];
  }

  if (mega) {
    loot.money *= 2;
  }

  return loot;
}
