import showdown from 'pokemon-showdown';
const { Dex } = showdown;

const pokedex = Dex.forGen(7);

export function getAllData(name) {
  return pokedex.species.get(name);
}
