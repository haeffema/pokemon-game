import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import { runOneArmedBandit } from '../../utils/gamble.js';

const commandData = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gamble 55 PokeDollar and get lucky');

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
    'Du hast 55 PokeDollar gesetzt. Lass uns sehen, ob du gewinnst!'
  );

  spieler.Geld -= 55;

  const earnings = await runOneArmedBandit(interaction.user.id);
  interaction.followUp(`You won ${earnings} PokeDollar!`);

  spieler.Geld += earnings;

  query = 'UPDATE spieler SET Geld = ? WHERE discordid = ?';
  await new Promise((resolve, reject) => {
    connection.query(
      query,
      [spieler.Geld, interaction.user.id],
      function (err) {
        if (err) {
          reject('Datenbankfehler: ' + err);
        } else {
          resolve();
        }
      }
    );
  });
  interaction.followUp(
    `Dein neues Guthaben beträgt ${spieler.Geld} PokeDollar.`
  );
};

export default {
  data: commandData,
  execute: execute,
};
