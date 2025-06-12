import pokeData from './data/pokemon.json' with { type: 'json' };

for (const mon of Object.keys(pokeData)) {
  console.log(mon, pokeData[mon].sets.length);
}
