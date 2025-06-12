import showdown from 'pokemon-showdown';
import { getPokepasteTeamFromHtml } from './pokepaste.js';
import { getAllUserPokemon, setPokemonPokepaste } from '../database/pokemon.js';
import { getAllItemsForUser } from '../database/item.js';
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
  const types = {};
  for (const pokemon of team) {
    if (pokemonNames.includes(pokemon.species)) {
      if (items.includes(pokemon.item)) {
        if (!errors['Doppelte Items']) {
          errors['Doppelte Items'] = {};
        }
        errors['Doppelte Items'][pokemon.item] = 'Jedes Item nur einmal!';
      }
      items.push(pokemon.item);
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
  const userItems = await getAllItemsForUser(userId);
  const validItem = userItems.find((item) => item.name === pokemon.item);
  if (!validItem && pokemon.item !== '') {
    error['Item'] = pokemon.item;
  }
  if (databaseEntry.shiny === 0 && pokemon.shiny) {
    error['shiny'] = false;
  }
  for (const move of pokemon.moves) {
    if (databaseSet.moves.includes(move)) {
      continue;
    }
    const moveData = pokemonData[pokemon.species.toLowerCase()].moves[move];
    if (!moveData) {
      error[move] = 'wird nicht gelernt -> wende dich an jan und max';
      break;
    }
    if (moveData['learn-method'] === 'TM') {
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
    }
    if (moveData['learn-method'] === 'Tutor') {
      error[move] = 'Tutor Move';
      if (await checkIfTutorMoveIsLearned(userId, databaseEntry.name, move)) {
        delete error[move];
      }
    }
  }
  return error;
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
