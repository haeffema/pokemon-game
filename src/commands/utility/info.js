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
        { name: 'Pokedex', value: 'pokedex' },
        { name: 'Items', value: 'items' },
        { name: "TM's", value: 'tms' }
      )
  );

export async function execute(interaction) {
  const category = interaction.options.getString('category');
  const userId = interaction.user.id;

  switch (category) {
    case 'overview':
      await interaction.reply('Overview information is not available yet.');
      break;
    case 'pokedex':
      const pokedexInfo = await generatePokepasteForTrainer(userId);
      await interaction.reply(`Pokedex information: ${pokedexInfo}`);
      break;
    case 'items':
      await interaction.reply('Items information is not available yet.');
      break;
    case 'tms':
      await interaction.reply('TM information is not available yet.');
      break;
    default:
      await interaction.reply('Invalid category selected.');
  }
}

export default {
  data: commandData,
  execute: execute,
};
