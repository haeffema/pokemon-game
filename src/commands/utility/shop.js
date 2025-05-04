import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';

const commandData = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('Buy special Items and TMs for Battle')
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('Select whether you want to buy Items or TMs')
      .setRequired(true)
      .addChoices([
        {
          name: 'Items',
          value: 'items',
        },
        {
          name: 'TMs',
          value: 'tms',
        },
      ])
  );

const execute = async (interaction) => {
  const discordId = interaction.user.id;

  await interaction.reply('Shop has been called with category: ');
};

export default {
  data: commandData,
  execute: execute,
};
