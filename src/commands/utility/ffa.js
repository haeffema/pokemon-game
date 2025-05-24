import { SlashCommandBuilder } from 'discord.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };
import { convertSetToPokepaste } from '../../utils/pokemon.js';
import { setupBattle, runBattle } from '../../utils/battle.js';

const commandData = new SlashCommandBuilder()
  .setName('ffa')
  .setDescription(
    '/fight but without rewards, limitations and shinys. They only exist in the wild.'
  );

const execute = async (interaction) => {
  await interaction.reply('aktuell deaktiviert');
  return;

  const validPokemon = Object.keys(pokemonData).filter((pokemon) => {
    if (pokemonData[pokemon].tier === 'Uber') {
      return pokemon;
    }
  });

  const randomWild =
    pokemonData[validPokemon[Math.floor(Math.random() * validPokemon.length)]];
  const randomTrainer =
    pokemonData[validPokemon[Math.floor(Math.random() * validPokemon.length)]];
  const wildSet =
    randomWild.sets[Math.floor(Math.random() * randomWild.sets.length)];
  const trainerSet =
    randomTrainer.sets[Math.floor(Math.random() * randomTrainer.sets.length)];
  const wildPokepaste = convertSetToPokepaste(wildSet, randomWild.name);
  const trainerPokepaste = convertSetToPokepaste(
    trainerSet,
    randomTrainer.name
  );

  const shiny = Math.random() < 0.1;

  await runBattle(
    setupBattle(trainerPokepaste, wildPokepaste),
    interaction.user.id,
    interaction.user.username,
    wildPokepaste,
    shiny,
    randomWild.types[0].toLowerCase(),
    true
  );
};

export default {
  data: commandData,
  execute: execute,
};
