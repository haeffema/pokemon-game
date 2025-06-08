import showdown from 'pokemon-showdown';
import { getPokepasteTeamFromHtml } from './pokepaste.js';
import { getAllUserPokemon } from '../database/pokemon.js';
import { getAllItemsForUser } from '../database/item.js';
import { getAllTmsForUser } from '../database/tm.js';
import pokemonData from '../data/pokemon.json' with { type: 'json' };
import tmData from '../data/tms.json' with { type: 'json' };

async function pokepasteToTeam(pokepasteUrl) {
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
    } else {
      errors[pokemon.species] = { owned: false };
    }
  }

  console.log(errors);
}

export async function validateSet(databaseEntry, pokemon, userId) {
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
      for (const tm of await getAllTmsForUser(userId)) {
        if (tmData[tm.tm].move === move) {
          delete error[move];
          break;
        }
      }
    }
    console.log(moveData);
  }
  return error;
}

let test = await pokepasteToTeam('https://pokepast.es/f36ab1c6bb7bb120');

await validateTeam('326305842427330560', test);
/**  
test = await pokepasteToTeam('https://pokepast.es/bb32bc663a73066c');

await validateTeam('326305842427330560', test);
*/
