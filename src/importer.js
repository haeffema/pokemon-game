import originalData from './data/pokemon.json' with { type: 'json' };
import adjustedData from '../test.json' with { type: 'json' };
import fs from 'fs/promises';

const newData = {};

const customData = {
  'farfetch’d': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/farfetchd',
    preEvo: null,
  },
  'mr. mime': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/mr-mime',
    preEvo: 'https://pokeapi.co/api/v2/pokemon/mime-jr',
  },
  deoxys: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/deoxys-normal',
    preEvo: null,
  },
  'deoxys-attack': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/deoxys-attack',
    preEvo: null,
  },
  'deoxys-defense': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/deoxys-defense',
    preEvo: null,
  },
  'deoxys-speed': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/deoxys-speed',
    preEvo: null,
  },
  wormadam: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/413',
    preEvo: 'https://pokeapi.co/api/v2/pokemon/burmy',
  },
  giratina: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/487',
    preEvo: false,
  },
  shaymin: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/492',
    preEvo: null,
  },
  'shaymin-sky': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/shaymin-sky',
    preEvo: null,
  },
  basculin: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/550',
    preEvo: null,
  },
  darmanitan: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/555',
    preEvo: 'https://pokeapi.co/api/v2/pokemon/darumaka',
  },
  tornadus: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/641',
    preEvo: null,
  },
  'tornadus-therian': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/tornadus-therian',
    preEvo: null,
  },
  thundurus: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/642',
    preEvo: null,
  },
  'thundurus-therian': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/thundurus-therian',
    preEvo: null,
  },
  landorus: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/645',
    preEvo: null,
  },
  'landorus-therian': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/landorus-therian',
    preEvo: null,
  },
  'kyurem-black': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/kyurem-black',
    preEvo: false,
  },
  'kyurem-white': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/kyurem-white',
    preEvo: false,
  },
  keldeo: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/647',
    preEvo: null,
  },
  'keldeo-resolute': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/keldeo-resolute',
    preEvo: null,
  },
  meloetta: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/648',
    preEvo: null,
  },
  meowstic: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/678',
    preEvo: 'https://pokeapi.co/api/v2/pokemon/espurr',
  },
  'meowstic-f': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/meowstic-female',
    preEvo: 'https://pokeapi.co/api/v2/pokemon/espurr',
  },
  aegislash: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/aegislash-shield',
    preEvo: 'https://pokeapi.co/api/v2/pokemon/honedge',
  },
  gourgeist: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/711',
    preEvo: 'https://pokeapi.co/api/v2/pokemon/710',
  },
  zygarde: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/718',
    preEvo: null,
  },
  'zygarde-10%': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/zygarde-10',
    preEvo: null,
  },
  'hoopa-unbound': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/hoopa-unbound',
    preEvo: false,
  },
  oricorio: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/741',
    preEvo: false,
  },
  "oricorio-pa'u": {
    fetch: 'https://pokeapi.co/api/v2/pokemon/oricorio-pau',
    preEvo: false,
  },
  lycanroc: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/745',
    preEvo: 'https://pokeapi.co/api/v2/pokemon/rockruff',
  },
  wishiwashi: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/746',
    preEvo: null,
  },
  minior: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/774',
    preEvo: null,
  },
  mimikyu: {
    fetch: 'https://pokeapi.co/api/v2/pokemon/778',
    preEvo: null,
  },
  'tapu koko': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/tapu-koko',
    preEvo: null,
  },
  'tapu lele': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/tapu-lele',
    preEvo: null,
  },
  'tapu bulu': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/tapu-bulu',
    preEvo: null,
  },
  'tapu fini': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/tapu-fini',
    preEvo: null,
  },
  'necrozma-dusk-mane': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/necrozma-dusk',
    preEvo: false,
  },
  'necrozma-dawn-wings': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/necrozma-dawn',
    preEvo: false,
  },
  'necrozma-ultra': {
    fetch: 'https://pokeapi.co/api/v2/pokemon/necrozma-ultra',
    preEvo: false,
  },
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const [key, values] of Object.entries(originalData)) {
  if (Object.keys(adjustedData).includes(key)) {
    newData[key] = adjustedData[key];
    continue;
  }

  console.log(`Gathering data for: ${key}`);

  newData[key] = values;
  newData[key].moves = {};

  const fetchData = customData[key];

  let response = await fetch(fetchData.fetch);
  if (!response.ok) throw new Error(`Original data not found for ${key}`);
  const originalData = await response.json();

  await delay(200);

  for (const move of originalData.moves) {
    const type = move.version_group_details.find(
      (item) => item.version_group.name === 'ultra-sun-ultra-moon'
    );
    if (type) {
      newData[key].moves[move.move.name] = {
        name: move.move.name,
        type: type.move_learn_method.name,
      };
    }
  }

  if (!fetchData.preEvo) {
    continue;
  }

  response = await fetch(fetchData.preEvo);
  if (!response.ok) throw new Error(`Original data not found for ${key}`);
  const preEvo = await response.json();

  await delay(200);

  for (const move of preEvo.moves) {
    const type = move.version_group_details.find(
      (item) =>
        item.version_group.name === 'ultra-sun-ultra-moon' &&
        item.move_learn_method.name === 'egg'
    );
    if (type) {
      if (!Object.keys(newData[key].moves).includes(move.move.name)) {
        newData[key].moves[move.move.name] = {
          name: move.move.name,
          type: 'egg',
        };
      }
    }
  }
}

await fs.writeFile('xtest.json', JSON.stringify(newData, null, 2));
