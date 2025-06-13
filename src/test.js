import pokemonData from './data/pokemon.json' with { type: 'json' };

for (const key of Object.keys(pokemonData)) {
  if (pokemonData[key].types.includes('Ghost')) {
    console.log(key);
  }
}
