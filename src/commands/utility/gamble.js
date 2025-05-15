import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import { runOneArmedBandit } from '../../utils/gamble.js';

const commandData = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gamble 57 PokeDollar and get lucky ... halbe approved!');

const execute = async (interaction) => {
  var query = 'SELECT * FROM spieler where discordid = ?';
  var spieler = await new Promise((resolve, reject) => {
    connection.query(query, [interaction.user.id], function (err, results) {
      if (err) {
        reject('Datenbankfehler: ' + err);
      } else {
        resolve(results[0]);
      }
    });
  });

  if (spieler.Geld < 57) {
    interaction.reply(
      'Du hast nicht genug Geld! Du brauchst mindestens 57 PokeDollar.'
    );
    return;
  }

  interaction.reply(
    'Du hast 57 PokeDollar gesetzt. Lass uns sehen, ob du gewinnst!'
  );

  spieler.Geld -= 57;

  const earnings = await runOneArmedBandit(interaction.user.id);
  if (earnings === 0) {
    interaction.followUp(
      'Leider hast du nichts gewonnen. Versuch es nochmal, denn statistisch gesehen, hören 99% aller Spieler vor ihrem großen Gewinn auf. 😉'
    );
  } else {
    interaction.followUp(`Du hast ${earnings} PokeDollar gewonnen!`);
  }

  spieler.Geld += earnings;

  query =
    'UPDATE spieler SET Geld = ?, gewinn = gewinn - 57 + ? WHERE discordid = ?';
  await new Promise((resolve, reject) => {
    connection.query(
      query,
      [spieler.Geld, earnings, interaction.user.id],
      function (err) {
        if (err) {
          reject('Datenbankfehler: ' + err);
        } else {
          resolve();
        }
      }
    );
  });
};

export default {
  data: commandData,
  execute: execute,
};
