import showdown from 'pokemon-showdown';
const { Dex } = showdown;
import { promises as fs } from 'fs';

const pokedex = Dex.forGen(7);

export function getAllData(name) {
  return pokedex.species.get(name);
}
