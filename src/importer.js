import originalData from './data/pokemon.json' with { type: 'json' };
import fs from 'fs/promises';

const newData = {};
const failedKeys = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const [key, value] of Object.entries(originalData)) {
  const oldData = value;

  try {
    console.log(`Processing ${key}...`);

    let response = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species/${value.id}`
    );
    if (!response.ok) throw new Error(`Species not found for ${key}`);
    let data = await response.json();

    await delay(200); // Delay between requests

    response = await fetch(data.evolution_chain.url);
    if (!response.ok) throw new Error(`Evolution chain not found for ${key}`);
    data = await response.json();

    await delay(200);

    const baseSpecies = data.chain.species.name;
    response = await fetch(`https://pokeapi.co/api/v2/pokemon/${baseSpecies}`);
    if (!response.ok)
      throw new Error(`Base species data not found for ${baseSpecies}`);
    data = await response.json();

    for (const move of data.moves) {
      const version = move.version_group_details.find(
        (item) =>
          item.version_group.name === 'ultra-sun-ultra-moon' &&
          item.move_learn_method.name === 'egg'
      );
      if (version) {
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

  await delay(200); // Delay between each main loop iteration
}

// Write updated data and failed keys
await fs.writeFile('test.json', JSON.stringify(newData, null, 2));
await fs.writeFile('failed_keys.json', JSON.stringify(failedKeys, null, 2));

console.log(
  `Done. Updated data written to test.json. Failed keys written to failed_keys.json.`
);
