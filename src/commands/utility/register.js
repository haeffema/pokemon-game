import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import { parsePokepaste, validateSet } from '../../utils/pokemon.js';

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
  const pokepasteText = interaction.options.getString('pokepaste');

  const parsedSet = parsePokepaste(pokepasteText);
  const validationResult = await validateSet(parsedSet, interaction.user.id);

  if (!validationResult.success) {
    await interaction.reply(`Validation failed: ${validationResult.message}`);
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

  await interaction.reply(
    `Pokemon set registered! ${validationResult.message}`
  );
};

export default {
  data: commandData,
  execute: execute,
};
