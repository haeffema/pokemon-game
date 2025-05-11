import connection from './databaseConnection.js';
import { EmbedBuilder } from 'discord.js';
import config from './config.json' with { type: 'json' };
import pokemonData from '../data/pokemon.json' with { type: 'json' };

const poolSize = 12;
const maxFights = 35;

async function filterPokemonByType(type, forbiddenTiers, number, discordid) {
  try {
    const allPokemon = Object.values(pokemonData);
    const filtered = allPokemon.filter(
      (p) =>
        (!type || p.types.includes(type)) && !forbiddenTiers.includes(p.tier)
    );

    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    const selected = filtered.slice(0, number);

    const pokemonListeStr = selected.map((p) => p.name).join(', ');
    const anzahl = selected.length;

    const query =
      'Insert into pool (typ, pokemonliste, anzahl, spieler, kämpfe, aktiv) VALUES(?,?,?,(Select name from spieler where discordid = ?),?, ?)';
    connection.query(query, [
      type,
      pokemonListeStr,
      anzahl,
      discordid,
      maxFights,
      1,
    ]);
    return pokemonListeStr;
  } catch (err) {
    console.error('Fehler beim Laden oder Verarbeiten der Datei:', err.message);
    return [];
  }
}

export async function generatePoolForPlayers() {
  const deactivateQuery = 'UPDATE pool SET aktiv = 0;';
  connection.query(deactivateQuery, (error, results, fields) => {
    if (error) {
      console.error('Error executing query:', error);
      connection.end((endErr) => {
        if (endErr) {
          console.error('Error closing connection:', endErr);
        } else {
          console.log('Connection closed.');
        }
      });
      return;
    }
  });

  const activeTypQuery = `
    SELECT typ
    FROM poolTag
    WHERE aktiv = 1;
  `;

  const activeType = await new Promise((resolve, reject) => {
    connection.query(activeTypQuery, (error, results, fields) => {
      if (error) {
        console.error('Error querying the database:', error);
        return;
      }
      resolve(results[0].typ);
    });
  });

  const playerQuery = `
  SELECT discordid
  FROM spieler;`;
  const players = await new Promise((resolve, reject) => {
    connection.query(playerQuery, (error, results, fields) => {
      if (error) {
        console.error('Error querying the database:', error);
        return;
      }
      resolve(results);
    });
  });

  players.forEach(async (player) => {
    const discordId = player.discordid;

    var forbiddenTiers;
    if (player.Orden == 0 || player.Orden == 1) {
      forbiddenTiers = ['Uber', 'OU', 'OUBL', 'UUBL', 'UU'];
    } else if (player.Orden == 2 || player.Orden == 3) {
      forbiddenTiers = ['Uber', 'OU', 'OUBL'];
    } else {
      forbiddenTiers = ['Uber'];
    }

    await filterPokemonByType(activeType, forbiddenTiers, poolSize, discordId);
  });
}

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

  generatePoolForPlayers();
  console.log('Generating pool for players...');
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
      const { channelId } = config;
      const channel = await bot.channels.fetch(channelId);
      await channel.send({ embeds: [message] });
      return;
    });
    return;
  });
}
