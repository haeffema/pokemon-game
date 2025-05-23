import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };
import { convertSetToPokepaste } from '../../utils/pokemon.js';
import { setupBattle, runBattle } from '../../utils/battle.js';

const commandData = new SlashCommandBuilder()
  .setName('ffa')
  .setDescription(
    '/fight but without rewards, limitations and shinys. They only exist in the wild.'
  );

const execute = async (interaction) => {
  await interaction.reply('Ein wilder Kampf beginnt!');
  const randomWild =
    pokemonData[
      Object.keys(pokemonData)[
        Math.floor(Math.random() * Object.keys(pokemonData).length)
      ]
    ];
  const randomTrainer =
    pokemonData[
      Object.keys(pokemonData)[
        Math.floor(Math.random() * Object.keys(pokemonData).length)
      ]
    ];
  const wildSet =
    randomWild.sets[Math.floor(Math.random() * randomWild.sets.length)];
  const trainerSet =
    randomTrainer.sets[Math.floor(Math.random() * randomTrainer.sets.length)];
  const wildPokepaste = convertSetToPokepaste(wildSet, randomWild.name);
  const trainerPokepaste = convertSetToPokepaste(
    trainerSet,
    randomTrainer.name
  );
  await runBattle(
    setupBattle(trainerPokepaste, wildPokepaste),
    interaction.user.id,
    interaction.user.username,
    wildPokepaste,
    false,
    randomWild.types[0].toLowerCase(),
    true
  );
};

export default {
  data: commandData,
  execute: execute,
};
