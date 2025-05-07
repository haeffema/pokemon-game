import connection from './databaseConnection.js';
import { EmbedBuilder } from 'discord.js';

async function sendMessage(receiverId, content, bot) {
  const message = new EmbedBuilder()
    .setTitle(content.titel)
    .setDescription(content.beschreibung)
    .setColor('Blue')
    .setThumbnail(content.sprite);
  let target = null;
  try {
    const channel = await bot.channels.fetch(receiverId);
    if (channel && (channel.isTextBased?.() || channel.isDMBased?.())) {
      target = channel;
    }
  } catch (channelError) {}
  if (!target) {
    try {
      const user = await bot.users.fetch(receiverId);
      if (user) {
        target = user;
      }
    } catch (userError) {}
  }
  if (target) {
    try {
      await target.send({ embeds: [message] });
      return true;
    } catch (sendError) {
      console.error(
        `Failed to send message to ${target.id}:`,
        sendError.message
      );
      if (sendError.code === 50007) {
        console.error(
          `Cannot send messages to this user (ID: ${target.id}). They might have DMs disabled or blocked the bot.`
        );
      }
      return false;
    }
  } else {
    console.error(
      `Could not find a valid channel or user with ID: ${receiverId}`
    );
    return false;
  }
}

function markMessageAsSent(messageId) {
  const query = `
    UPDATE nachrichten
    SET gesendet = 1
    WHERE id = ?;
  `;
  connection.query(query, [messageId], (error, results, fields) => {
    if (error) {
      console.error('Error updating the database:', error);
      return;
    }
  });
}

export function checkForMessagesToSend(bot) {
  const query = `
    SELECT empfaenger, titel, beschreibung, sprite, zeitpunkt, id
    FROM nachrichten
    WHERE gesendet = 0;
  `;
  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error('Error querying the database:', error);
      return;
    }

    if (results.length === 0) {
      console.log('No unsent messages found.');
      return;
    }
    results.forEach((row) => {
      if (Date.now() > new Date(row.zeitpunkt).getTime()) {
        if (
          sendMessage(
            row.empfaenger,
            {
              titel: row.titel,
              beschreibung: row.beschreibung,
              sprite: row.sprite,
            },
            bot
          )
        ) {
          markMessageAsSent(row.id);
        }
        return;
      }
    });
  });
}
