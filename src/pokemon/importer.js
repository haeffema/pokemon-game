import tiers from './tiers.json' with { type: 'json' };
import dex from './pokedex.json' with { type: 'json' };

const pokedex = dex['Pokedex'];

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

const data = {};

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

  if (tiers[pokemonToCheck]['tier'] == 'Illegal') {
    continue;
  }

  if (
    pokemon['name'].endsWith('-Mega') ||
    pokemon['name'].endsWith('-Mega-X') ||
    pokemon['name'].endsWith('-Mega-Y')
  ) {
    continue;
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
