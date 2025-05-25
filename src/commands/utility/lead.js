import { SlashCommandBuilder } from 'discord.js';
import connection from '../../database/databaseConnection.js';

const commandData = new SlashCommandBuilder()
  .setName('lead')
  .setDescription('Choose your lead Pokemon to fight against wild Pokemon')
  .addStringOption((option) =>
    option
      .setName('pokemon')
      .setDescription('Your available Pokémon')
      .setRequired(true)
      .setAutocomplete(true)
  );

const execute = async (interaction) => {
  const discordId = interaction.user.id;
  const chosenPokemon = interaction.options.getString('pokemon');

  // 1. Prüfen, ob das gewählte Pokémon dem Spieler gehört und im Team ist
  const verifyQuery = `
        SELECT name FROM pokemon 
        WHERE name = ? AND spieler = (
            SELECT name FROM spieler WHERE discordid = ?
        )
    `;

  let isValid = false;

  try {
    const results = await new Promise((resolve, reject) => {
      connection.query(
        verifyQuery,
        [chosenPokemon, discordId],
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    isValid = results.length > 0;
  } catch (err) {
    console.error('Verification DB error:', err);
    await interaction.reply({ content: '❌ Database error.' });
    return;
  }

  if (!isValid) {
    await interaction.reply({
      content: `❌ Ungültige Auswahl: Das Pokemon ${chosenPokemon} existiert nicht oder du hast es noch nicht gefangen.`,
    });
    return;
  }

  // 2. Lead zurücksetzen und neues Lead-Pokémon setzen
  const resetQuery = `
        UPDATE pokemon 
        SET lead = 0 
        WHERE spieler = (SELECT name FROM spieler WHERE discordid = ?)
    `;

  const setQuery = `
        UPDATE pokemon 
        SET lead = 1 
        WHERE name = ? AND spieler = (SELECT name FROM spieler WHERE discordid = ?)
    `;

  try {
    await new Promise((resolve, reject) => {
      connection.query(resetQuery, [discordId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      connection.query(setQuery, [chosenPokemon, discordId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await interaction.reply({
      content: `${chosenPokemon} has been set as your lead Pokémon!`,
    });
  } catch (err) {
    console.error('Update DB error:', err);
    await interaction.reply({
      content: 'Failed to update your lead Pokémon.',
    });
  }

  //await interaction.reply('Lead Pokemon has been set!');
};

export default {
  data: commandData,
  execute: execute,
};
