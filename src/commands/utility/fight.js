import { SlashCommandBuilder } from 'discord.js';

const commandData = new SlashCommandBuilder()
    .setName('fight')
    .setDescription('Starts a fight with a wild Pokemon');

const execute = async (interaction) => {
    await interaction.reply('Fight started!');
};

export default {
    data: commandData,
    execute: execute
};