import tiers from './tiers.json' with { type: 'json' };
import dex from './pokedex.json' with { type: 'json' };
import pokemonData from './pokemon_data.json' with { type: 'json' };
import { promises } from 'node:fs';

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

  let moves = {};

  for (let moveNum in pokemonData[pokemonToCheck]['moves']) {
    const move = pokemonData[pokemonToCheck]['moves'][moveNum];
    const detailSunMoon = move.version_group_details.find(
      (detail) => detail.version_group.name === 'ultra-sun-ultra-moon'
    );
    if (!detailSunMoon) {
      continue;
    }
    const learnType = detailSunMoon.move_learn_method.name;

    moves[move['move']['name']] = {
      name: move['move']['name'],
      type: learnType,
    };
  }

  data[pokemon['name'].toLowerCase()] = {
    id: pokemon['num'],
    name: pokemon['name'],
    types: pokemon['types'],
    abilities: abilities,
    moves: moves,
    tier: tiers[pokemonToCheck]['tier'],
    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon['num']}.png`,
  };
}

let jsonData = JSON.stringify(data, null, 2);
await promises.writeFile('data.json', jsonData, 'utf8');
