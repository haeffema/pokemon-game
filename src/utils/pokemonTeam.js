import showdown from 'pokemon-showdown';
import { getPokepasteTeamFromHtml } from './pokepaste.js';
import { getAllUserPokemon, setPokemonPokepaste } from '../database/pokemon.js';
import { userHasItem } from '../database/item.js';
import { getAllTmsForUser } from '../database/tm.js';
import { checkIfTutorMoveIsLearned } from '../database/tutor.js';
import { sendMessage } from './sendMessage.js';
import pokemonData from '../data/pokemon.json' with { type: 'json' };
import tmData from '../data/tms.json' with { type: 'json' };

export async function pokepasteToTeam(pokepasteUrl) {
  const rawTeamString = await getPokepasteTeamFromHtml(pokepasteUrl);
  return showdown.Teams.import(rawTeamString);
}

export async function validateTeam(userId, team) {
  const errors = {};
  const userPokemon = await getAllUserPokemon(userId);
  const pokemonNames = userPokemon.map((p) => p.name);
  const items = [];
  const pokemonList = [];
  const types = {};
  for (const pokemon of team) {
    if (pokemonList.includes(pokemon.species)) {
      if (!errors['Pokemon Doppelt']) {
        errors['Pokemon Doppelt'] = {};
      }
      errors['Pokemon Doppelt'][pokemon.species] = 'Jedes Pokemon nur einmal';
    }
    pokemonList.push(pokemon.species);
    if (pokemonNames.includes(pokemon.species)) {
      if (items.includes(pokemon.item)) {
        if (!errors['Doppelte Items']) {
          errors['Doppelte Items'] = {};
        }
        errors['Doppelte Items'][pokemon.item] = 'Jedes Item nur einmal!';
      }
      if (pokemon.item !== '') {
        items.push(pokemon.item);
      }
      for (const type of pokemonData[pokemon.species.toLowerCase()].types) {
        if (Object.keys(types).includes(type)) {
          types[type] += 1;
          if (types[type] > 2) {
            if (!errors['Typ']) {
              errors['Typ'] = {};
            }
            errors['Typ'][type] = 'Jeden Typ maximal zweimal.';
          }
        } else {
          types[type] = 1;
        }
      }
      errors[pokemon.species] = await validateSet(
        userPokemon.find((p) => p.name === pokemon.species),
        pokemon,
        userId
      );
      if (Object.keys(errors[pokemon.species]).length === 0) {
        await setPokemonPokepaste(
          userId,
          pokemon.species,
          showdown.Teams.export([pokemon])
        );
      }
    } else {
      errors[pokemon.species] = { notOwned: true };
    }
  }
  return errors;
}

async function validateSet(databaseEntry, pokemon, userId) {
  const error = {};
  const databaseSet = showdown.Teams.import(databaseEntry.pokepaste)[0];
  if (databaseEntry.shiny === 0 && pokemon.shiny) {
    error['shiny'] = false;
  }
  for (const move of pokemon.moves) {
    if (databaseSet.moves.includes(move)) {
      continue;
    }
    switch (getLearnMethod(databaseEntry.name, move)) {
      case 'tutor': {
        error[move] = 'Tutor Move';
        if (await checkIfTutorMoveIsLearned(userId, databaseEntry.name, move)) {
          delete error[move];
        }
        break;
      }
      case 'machine': {
        error[move] = 'TM nicht gekauft';
        for (const tm of await getAllTmsForUser(userId)) {
          if (
            tmData[tm.tm].move ===
            `${move.startsWith('Hidden Power') ? 'Hidden Power' : move}`
          ) {
            delete error[move];
            break;
          }
        }
        break;
      }
      case null: {
        error[move] = 'wird nicht gelernt -> wende dich an jan und max';
        break;
      }
    }
    if (
      [
        'Double Team',
        'Minimize',
        'Acupressure',
        'Sand Attack',
        'Smokescreen',
        'Kinesis',
        'Flash',
        'Mud-Slap',
        'Mud Bomb',
        'Muddy Water',
        'Sweet Scent',
        'Mirror Shot',
        'Octazooka',
      ].includes(move)
    ) {
      error[move] =
        'Keine Moves die Fluchtwert steigert oder gegnerische Genauigkeit senken.';
    }
  }
  if (
    (pokemon.item === 'Gengarite' && pokemon.species === 'Gengar') ||
    pokemon.ability === 'Shadow Tag' ||
    pokemon.ability === 'Arena Trap'
  ) {
    error['Illegale Ability'] = 'Shadow Tag/Arena Trap ist nicht erlaubt!';
  }
  if (['Bright Powder', 'Lax Incense'].includes(pokemon.item)) {
    error['Illegales Item'] = 'Lax Incense und Bright Powder sind verboten.';
  }
  if (
    [
      'Sand Veil',
      'Snow Cloak',
      'Tangled Feet',
      'Wonder Skin',
      'Moody',
    ].includes(pokemon.ability)
  ) {
    error['Illegale Ability'] =
      'Keine Ability die Fluchtwert steigert oder gegnerische Genauigkeit senkt.';
  }
  if (!(await userHasItem(userId, pokemon.item)) && pokemon.item !== '') {
    error[pokemon.item] = 'Du besitzt dieses Item nicht.';
  }
  return error;
}

function getLearnMethod(pokemonName, moveName) {
  const move = showdown.Dex.mod('gen7').moves.get(moveName);
  if (!move.exists) {
    return null;
  }
  const normalizedMoveId = move.id;

  for (let genNum = 7; genNum >= 1; genNum--) {
    const gen = `gen${genNum}`;
    const dex = showdown.Dex.mod(gen);

    const initialPokemon = dex.species.get(pokemonName);
    if (!initialPokemon.exists) {
      continue;
    }

    let currentPokemon = initialPokemon;

    while (currentPokemon && currentPokemon.exists) {
      const learnset = dex.data.Learnsets[currentPokemon.id];

      if (
        learnset &&
        learnset.learnset &&
        learnset.learnset[normalizedMoveId]
      ) {
        const methods = learnset.learnset[normalizedMoveId];

        const learnMethods = [];

        for (const methodCode of methods) {
          const learnGen = parseInt(methodCode[0], 10);
          const learnMethodChar = methodCode[1];

          if (learnGen === genNum) {
            switch (learnMethodChar) {
              case 'L':
              case 'E':
              case 'S':
              default:
                learnMethods.push('f');
                break;
              case 'M':
                learnMethods.push('m');
                break;
              case 'T':
                learnMethods.push('t');
                break;
            }
          }
        }
        if (learnMethods.includes('f')) {
          return true;
        }
        if (learnMethods.includes('m')) {
          return 'machine';
        }
        if (learnMethods.includes('t')) {
          return 'tutor';
        }
      }

      if (currentPokemon.changesFrom) {
        currentPokemon = dex.species.get(currentPokemon.changesFrom);
      } else if (currentPokemon.prevo !== '') {
        currentPokemon = dex.species.get(currentPokemon.prevo);
      } else {
        currentPokemon = null;
      }
    }
  }

  return null;
}

export async function validateTeamWithMessages(
  user,
  pokepaste,
  teamSize = undefined
) {
  const team = await pokepasteToTeam(pokepaste);

  if (teamSize) {
    if (team.length > teamSize) {
      await sendMessage(
        {
          noSprite: true,
          title: 'OVERLOAD',
          description: `Du kannst maximal ${teamSize} Pokemon mitnehmen.`,
          color: 'Red',
        },
        user.discordId
      );
      return { valid: false };
    }
  }

  const errors = await validateTeam(user.discordId, team);
  let errorCounter = 0;

  if (!teamSize) {
    delete errors['Typ'];
    delete errors['Doppelte Items'];
  }

  for (const error of Object.keys(errors)) {
    if (Object.keys(errors[error]).length !== 0) {
      errorCounter += 1;
      if (errors[error].notOwned) {
        await sendMessage(
          {
            noSprite: true,
            title: error,
            description: 'Du besitzt dieses Pokemon nicht.',
            color: 'Red',
          },
          user.discordId
        );
      } else {
        let errorString = '';
        for (const errorType of Object.keys(errors[error])) {
          errorString += `${errorType}: ${errors[error][errorType]}\n`;
        }
        await sendMessage(
          {
            noSprite: true,
            title: error,
            description: errorString,
            color: 'Red',
          },
          user.discordId
        );
      }
    }
  }
  return { valid: errorCounter === 0, teamSize: team.length };
}

export function getAllTutorMovesForPokemon(pokemonName) {
  const gen = 'gen7';
  const dex = showdown.Dex.mod(gen);

  const initialPokemon = dex.species.get(pokemonName);

  if (!initialPokemon.exists) {
    console.warn(`Pokémon '${pokemonName}' not found in Generation 7 data.`);
    return [];
  }

  const allLearnedMoves = new Set();
  let currentPokemon = initialPokemon;

  while (currentPokemon && currentPokemon.exists) {
    const learnsetEntry = dex.data.Learnsets[currentPokemon.id];

    if (learnsetEntry && learnsetEntry.learnset) {
      for (const moveId in learnsetEntry.learnset) {
        if (
          Object.prototype.hasOwnProperty.call(learnsetEntry.learnset, moveId)
        ) {
          const methods = learnsetEntry.learnset[moveId];
          const moveAvailableInGen7 = methods.some((methodCode) => {
            return parseInt(methodCode[0], 10) === 7;
          });

          if (moveAvailableInGen7) {
            const move = dex.moves.get(moveId);
            if (
              move.exists &&
              move.name &&
              getLearnMethod(pokemonName, move.name) === 'tutor'
            ) {
              allLearnedMoves.add(move.name);
            }
          }
        }
      }
    }

    if (currentPokemon.changesFrom) {
      currentPokemon = dex.species.get(currentPokemon.changesFrom);
    } else if (currentPokemon.prevo !== '') {
      currentPokemon = dex.species.get(currentPokemon.prevo);
    } else {
      currentPokemon = null;
    }
  }

  return Array.from(allLearnedMoves).sort();
}
