import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };

const commandData = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register a Pokemon set using its pokepaste')
    .addStringOption(option =>
        option.setName('pokepaste')
            .setDescription('Link to your Pokepaste')
            .setRequired(true)
    );

    const execute = async (interaction) => {
        const pokepasteLink = interaction.options.getString('pokepaste');
        await interaction.reply(`Pokemon set registered! You provided: ${pokepasteLink}`);
    };
    
    export default {
        data: commandData,
        execute: execute
    };