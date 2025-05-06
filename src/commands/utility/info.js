import { SlashCommandBuilder } from 'discord.js';
import { generatePokepasteForTrainer } from '../../utils/pokemon.js';

const commandData = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Get information in a specific category')
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('The category to get information about.')
      .setRequired(true)
      .addChoices(
        { name: 'Overview', value: 'overview' },
        { name: 'Pokedex', value: 'pokedex' }
      )
  );

export async function execute(interaction) {
  const category = interaction.options.getString('category');
  const userId = interaction.user.id;

  switch (category) {
    case 'overview': {
      await interaction.reply('Overview information is not available yet.');
      break;
    }
    case 'pokedex': {
      const pokedexInfo = await generatePokepasteForTrainer(userId);
      await interaction.reply(`Your Pokedex: ${pokedexInfo}`);
      break;
    }
    default:
      await interaction.reply('Invalid category selected.');
  }
}

export default {
  data: commandData,
  execute: execute,
};
