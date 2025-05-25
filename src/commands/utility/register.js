import { SlashCommandBuilder } from 'discord.js';
import connection from '../../database/databaseConnection.js';
import { parsePokepaste, validateSet } from '../../pokemon/pokemon.js';

const commandData = new SlashCommandBuilder()
  .setName('register')
  .setDescription('Register a Pokemon set using its pokepaste')
  .addStringOption((option) =>
    option
      .setName('pokepaste')
      .setDescription('Pokepaste for your Pokemon')
      .setRequired(true)
  );

const execute = async (interaction) => {
  try {
    await interaction.deferReply();
    const pokepasteText = interaction.options.getString('pokepaste');

    const parsedSet = parsePokepaste(pokepasteText);
    const validationResult = await validateSet(parsedSet, interaction.user.id);

    if (!validationResult.success) {
      await interaction.editReply(
        `Validation failed: ${validationResult.message}`
      );
      return;
    }
    var query =
      'Update pokemon p inner join spieler s on p.Spieler = s.Name set pokepaste = ? where p.name = ? and discordid = ?';
    connection.query(
      query,
      [parsedSet.pokePasteStringFormat, parsedSet.name, interaction.user.id],
      (err, results) => {
        if (err) {
          console.error('Error executing query:', err);
          return;
        }
        console.log(results.affectedRows);
      }
    );

    await interaction.editReply(
      `Pokemon set registered! ${validationResult.message}`
    );
  } catch (error) {
    console.error('Mal wieder unknown interaction aber können wir ignorieren');
  }
};

export default {
  data: commandData,
  execute: execute,
};
