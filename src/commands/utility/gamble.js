import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import { runOneArmedBandit } from '../../utils/gamble.js';

const commandData = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gamble 57 PokeDollar and get lucky');

const execute = async (interaction) => {
  interaction.reply('Gamble started!');
  const earnings = await runOneArmedBandit(interaction.user.id);
  interaction.followUp(`You won ${earnings} PokeDollar!`);
};

export default {
  data: commandData,
  execute: execute,
};
