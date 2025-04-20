import tiers from './tiers.json' with { type: 'json' };
import dex from './pokedex.json' with { type: 'json' };

const moves = dex['Moves'];
const pokedex = dex['Pokedex'];
const learnsets = dex['Learnsets'];

function isVaildNotEvolved(str) {
  const underevolvedTiers = [
    'UBER',
    'OU',
    'UUBL',
    'UU',
    'RUBL',
    'RU',
    'NUBL',
    'NU',
  ];
  for (let i = 0; i < underevolvedTiers.length; i++) {
    if (str == underevolvedTiers[i]) {
      return true;
    }
  }
  return false;
}

const moveData = {};
const data = {};

for (let move in moves) {
  if (moves[move]['isZ']) {
    continue;
  }
  moveData[move] = moves[move];
  moveData[move]['pokemon'] = [];
}

for (let pokemonToCheck in tiers) {
  console.log(pokemonToCheck);
  const pokemon = pokedex[pokemonToCheck];
  if (pokemon['evos']) {
    if (!isVaildNotEvolved(tiers[pokemonToCheck]['tier'])) {
      continue;
    }
  }
  const abilities = [];
  for (let ability in pokemon['abilities']) {
    abilities.push(pokemon['abilities'][ability]);
  }

  for (let move in learnsets[pokemonToCheck]) {
    if (moveData[move]) {
      moveData[move]['pokemon'].push(pokemonToCheck);
    }
  }

  data[pokemonToCheck] = {
    id: pokemon['num'],
    name: pokemon['name'],
    types: pokemon['types'],
    abilities: abilities,
    tier: tiers[pokemonToCheck]['tier'],
  };
}

import { promises } from 'node:fs';

let jsonData = JSON.stringify(data, null, 2);
await promises.writeFile('data.json', jsonData, 'utf8');

jsonData = JSON.stringify(moveData, null, 2);
await promises.writeFile('moves.json', jsonData, 'utf8');
