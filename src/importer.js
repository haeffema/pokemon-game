import originalData from './data/pokemon.json' assert { type: 'json' };

const newData = {};

for (const [key, value] of Object.entries(originalData)) {
  let response = await fetch(
    `https://pokeapi.co/api/v2/pokemon-species/${key}`
  );
  let data = await response.json();
  response = await fetch(data.evolution_chain.url);
  data = await response.json();
  response = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${data.chain.species.name}`
  );
  data = await response.json();
  console.log(data.moves);
  break;
}
