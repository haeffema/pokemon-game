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
  for (const pokemon of team) {
    if (pokemonNames.includes(pokemon.species)) {
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
  if (!validItem) {
    error['item'] = pokemon.item;
  }
  if (databaseEntry.shiny === 0 && pokemon.shiny) {
    error['shiny'] = false;
  }
  for (const move of pokemon.moves) {
    if (databaseSet.moves.includes(move)) {
      continue;
    }
    const moveData =
      pokemonData[pokemon.species.toLowerCase()].moves[
        move.toLowerCase().replace(' ', '-')
      ];
    if (moveData.type === 'machine') {
      error[move] = 'TM not owned';
      for (const tm of await getAllTmsForUser(userId)) {
        if (tmData[tm.tm].move === move) {
          delete error[move];
          break;
        }
      }
    }
    if (moveData.type === 'tutor') {
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
