import connection from './databaseConnection.js';
import { EmbedBuilder } from 'discord.js';

function generatePoolForPlayers() {}

export function updatePoolIfNeeded(bot) {
  const query = `
    SELECT id, tag
    FROM poolTag
    WHERE aktiv = 1;
  `;

  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error('Error querying the database:', error);
      return;
    }

    if (results.length === 0) {
      activatePoolTag(1, bot);
      return;
    }
    results.forEach((row) => {
      const currentDate = new Date();
      if (
        new Date(row.tag) <
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate()
        )
      ) {
        console.log(`Pool tag ${row.id} is outdated. Deactivating...`);
        deactivatePoolTag(row.id);
        let id = row.id + 1;
        while (id > 18) {
          id -= 18;
        }
        activatePoolTag(id, bot);
        return;
      }
      return;
    });
  });
}

function activatePoolTag(id, bot) {
  const query = `
      UPDATE poolTag
      SET aktiv = 1,
          tag = ?
      WHERE id = ?;
    `;

  const now = new Date();
  const serverTimeZone = 'Europe/Berlin';
  const year = now.toLocaleString('en-US', {
    year: 'numeric',
    timeZone: serverTimeZone,
  });
  const month = now.toLocaleString('en-US', {
    month: '2-digit',
    timeZone: serverTimeZone,
  });
  const day = now.toLocaleString('en-US', {
    day: '2-digit',
    timeZone: serverTimeZone,
  });

  const currentDateInServerTimeZone = `${year}-${month}-${day}`;

  connection.query(
    query,
    [currentDateInServerTimeZone, id],
    (error, results, fields) => {
      if (error) {
        return;
      }
      console.log(
        `Pool tag ${id} activated with tag set to ${currentDateInServerTimeZone}.`
      );
      sendActivatedPoolMessage(bot);
      return;
    }
  );
}

function deactivatePoolTag(id) {
  const query = `
    UPDATE poolTag
    SET aktiv = 0
    WHERE id = ?;
  `;
  connection.query(query, [id], (error, results, fields) => {
    if (error) {
      return;
    }
    console.log(`Pool tag ${id} deactivated.`);
    return;
  });
}

async function sendActivatedPoolMessage(bot) {
  console.log('Sending activated pool message...');
  const query = `
    SELECT text
    FROM poolTag
    WHERE aktiv = 1;
  `;
  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error('Error querying the database:', error);
      return;
    }

    if (results.length === 0) {
      console.log('No active pool tag found.');
      return;
    }
    results.forEach(async (row) => {
      const message = new EmbedBuilder()
        .setTitle('Täglicher Bericht des Professors')
        .setDescription(row.text)
        .setColor('Yellow')
        .setThumbnail(
          'https://play.pokemonshowdown.com/sprites/trainers/oak.png'
        );
      const channel = await bot.channels.fetch('1369593938163269674');
      await channel.send({ embeds: [message] });
      return;
    });
    return;
  });
}
