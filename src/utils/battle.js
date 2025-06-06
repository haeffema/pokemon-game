import { getUserById } from '../database/user.js';
import { getAllUserPokemon, getUserLeadPokemon } from '../database/pokemon.js';
import { getActivePool } from '../database/pool.js';
import { maxEncounters, maxNewEncounters } from '../config.js';
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';
import showdown from 'pokemon-showdown';
import tierData from '../data/tierPropabilities.json' with { type: 'json' };
import pokemonData from '../data/pokemon.json' with { type: 'json' };
import { sendBattleImage } from './imageGenerator.js';

const activeBattles = {};

const trainerID = 'p1';
const botID = 'p2';

async function getRandomEncounterForPlayer(user) {
  if (user.encounters >= maxEncounters) {
    return false;
  }

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
    if (user.newEncounters >= maxNewEncounters) {
      if (
        pokemonData[pokemon].tier === randomTier &&
        pokemonData[pokemon].types.includes(activePool.type) &&
        !userPokemonNames.includes(pokemonData[pokemon].name)
      ) {
        availablePokemon.push(pokemon);
      }
    } else {
      if (
        pokemonData[pokemon].tier === randomTier &&
        pokemonData[pokemon].types.includes(activePool.type)
      ) {
        availablePokemon.push(pokemon);
        if (!userPokemonNames.includes(pokemonData[pokemon].name)) {
          availablePokemon.push(pokemon);
          availablePokemon.push(pokemon);
        }
      }
    }
  }
  if (availablePokemon.length === 0) {
    return await getRandomEncounterForPlayer(user.discordId);
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

async function getRandomSetForPokemon(pokemon, user) {
  const randomPokemonData = pokemonData[pokemon];
  const sets = randomPokemonData.sets;
  const set = sets[Math.floor(Math.random() * sets.length)];
  set['name'] = '';
  set['species'] = randomPokemonData.name;
  set['ivs'] = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
  set['level'] = 100;
  set['happiness'] = 255;
  if (user.badges === 8) {
    set['shiny'] = Math.floor(Math.random() * 4098) === 187;
  } else {
    set['shiny'] = Math.floor(Math.random() * 8196) === 187;
  }

  return set;
}

async function botChooseHighestDamageMove(battle) {
  /**
   * This function automatically chooses the highest damaging move for the bot user.
   */
  const attackerShowdown = battle.p2.active[0];
  const defenderShowdown = battle.p1.active[0];
  const gen = Generations.get(battle.gen);
  const attacker = formatForCalc(attackerShowdown);
  const defender = formatForCalc(defenderShowdown);
  const moves = attackerShowdown.set.moves;
  let bestMoveIndex = 0;
  let maxDamage = -1;
  if (attackerShowdown.volatiles.twoturnmove) {
    battle.choose(botID, 'move 1');
    return;
  }
  for (let i = 0; i < moves.length; i++) {
    const moveName = moves[i];
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
  }
  battle.choose(botID, `move ${bestMoveIndex + 1}`);
}

function formatForCalc(pokemon) {
  /**
   * This function formats a battle engine pokemon to a format valid to be used in the calculator.
   */
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

  return new Pokemon(pokemon.battle.gen, set.name, {
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

export async function startNewBattle(userId) {
  const user = await getUserById(userId);
  if (activeBattles[userId]) {
    return false;
  }
  const userLead = await getUserLeadPokemon(userId);
  const trainerPokemon = showdown.Teams.import(userLead.pokepaste);
  const wildEncounter = await getRandomEncounterForPlayer(user);
  const wildSet = await getRandomSetForPokemon(wildEncounter.pokemon, user);

  const battle = new showdown.Battle({ formatid: 'gen7customgame' });

  battle.setPlayer(trainerID, { name: 'Trainer', team: trainerPokemon });
  battle.setPlayer(botID, { name: 'Wild', team: [wildSet] });

  battle.choose(trainerID, 'team 1');
  battle.choose(botID, 'team 1');

  activeBattles[userId] = {
    encounter: wildEncounter,
    battle: battle,
  };
  return true;
}

export async function runBattle(userId) {
  if (!activeBattles[userId]) {
    return false;
  }
  const battle = activeBattles[userId].battle;

  await sendBattleImage(battle.p1.active[0], battle.p2.active[0], userId);

  if (!battle.ended) {
    const userResponse = 1;
    battle.choose(trainerID, `move ${userResponse}`);
    await botChooseHighestDamageMove(battle);
    await runBattle(userId);
    return;
  }
  // do some loot calcs
  // console.log(activeBattles[userId]);
}

await startNewBattle('360368525379895298');
await runBattle('360368525379895298');
