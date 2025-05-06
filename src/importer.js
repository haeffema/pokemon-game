import originalData from './data/pokemon.json' with { type: 'json' };
import fs from 'fs/promises';

const newData = {};
const failedKeys = [];

const customPreEvos = {
  'raticate-alola': 'rattata-alola',
  'raichu-alola': 'pichu',
  'sandslash-alola': 'sandshrew-alola',
  'ninetales-alola': 'vulpix-alola',
  'dugtrio-alola': 'diglett-alola',
  'persian-alola': 'meowth-alola',
  'golem-alola': 'geodude-alola',
  'muk-alola': 'grimer-alola',
  'exeggutor-alola': 'exeggcute',
  'marowak-alola': 'cubone',
  'rotom-mow': 'rotom-mow',
  'rotom-fan': 'rotom-fan',
  'rotom-frost': 'rotom-frost',
  'rotom-heat': 'rotom-heat',
  'rotom-wash': 'rotom-wash',
  'mr. mime': 59,
  basculin: 550,
  'meowstic-f': 'meowstic',
  gourgeist: 711,
  oricorio: 741,
  'oricorio-pom-pom': 741,
  "oricorio-pa'u": 741,
  'oricorio-sensu': 741,
  'lycanroc-midnight': 745,
  'lycanroc-dusk': 745,
  wishiwashi: 746,
  mimikyu: 778,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const [key, value] of Object.entries(originalData)) {
  const oldData = value;
  oldData['moves'] = {};

  let response;

  try {
    console.log(`Processing ${key}...`);

    let preEvo = customPreEvos[key];

    if (!preEvo) {
      response = await fetch(
        `https://pokeapi.co/api/v2/pokemon-species/${value.id}`
      );
      if (!response.ok) throw new Error(`Species not found for ${key}`);
      preEvo = await response.json();
      await delay(200);
    }

    let url;

    if (!preEvo.evolution_chain) {
      url = `https://pokeapi.co/api/v2/pokemon/${preEvo}`;
    } else {
      response = await fetch(preEvo.evolution_chain.url);
      if (!response.ok) throw new Error(`Evolution chain not found for ${key}`);
      let preEvoData = await response.json();
      await delay(200);
      url = `https://pokeapi.co/api/v2/pokemon/${preEvoData.chain.species.name}`;
    }

    response = await fetch(url);
    if (!response.ok) throw new Error(`Base species data not found for ${url}`);
    const baseSpecies = await response.json();

    await delay(200);

    response = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
    if (!response.ok) throw new Error(`Original data not found for ${key}`);
    const originalData = await response.json();

    for (const move of originalData.moves) {
      const type = move.version_group_details.find(
        (item) => item.version_group.name === 'ultra-sun-ultra-moon'
      );
      if (type) {
        oldData['moves'][move.move.name] = {
          name: move.move.name,
          type: type.move_learn_method.name,
        };
      }
    }
    for (const move of baseSpecies.moves) {
      const type = move.version_group_details.find(
        (item) =>
          item.version_group.name === 'ultra-sun-ultra-moon' &&
          item.move_learn_method.name === 'egg'
      );
      if (type) {
        if (!Object.keys(oldData.moves).includes(move.move.name)) {
          oldData.moves[move.move.name] = {
            name: move.move.name,
            type: 'egg',
          };
        }
      }
    }
    newData[key] = oldData;
  } catch (err) {
    console.warn(`Skipping ${key}: ${err.message}`);
    failedKeys.push(key);
    continue;
  }

  await delay(200);
}

await fs.writeFile('test.json', JSON.stringify(newData, null, 2));
await fs.writeFile('failed_keys.json', JSON.stringify(failedKeys, null, 2));

console.log(
  `Done. Updated data written to test.json. Failed keys written to failed_keys.json.`
);
