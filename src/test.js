import {
  getAllUserPokemon,
  checkIfUserHasPokemon,
  setPokemonAsLead,
} from './database/pokemon.js';

console.log(await getAllUserPokemon(326305842427330560));
console.log(await checkIfUserHasPokemon(326305842427330560, 'Minior'));
await setPokemonAsLead(326305842427330560, 'Minior');
