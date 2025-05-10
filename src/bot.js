import cron from 'cron';
import util from 'util';
import { v4 as uuid } from 'uuid';
import QuickChart from 'quickchart-js';
import { exec } from 'child_process';
import { EventEmitter } from 'events';

import pokemonData from './data/pokemon.json' with { type: 'json' };
import droppableItems from './data/droppable_items.json' with { type: 'json' };

import {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  Embed,
  Collection,
} from 'discord.js';

import bot from './utils/client.js';

import connection from '../src/utils/databaseConnection.js';

async function filterPokemonByType(type, forbiddenTiers, number) {
  try {
    const allPokemon = Object.values(pokemonData);
    // Filtern mit optionalem Typ
    const filtered = allPokemon.filter(
      (p) =>
        (!type || p.types.includes(type)) && !forbiddenTiers.includes(p.tier)
    );

    // Mischen des Arrays mit dem Fisher-Yates-Algorithmus
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    const selected = filtered.slice(0, number);

    // Kommagetrennte Liste erstellen
    const pokemonListeStr = selected.map((p) => p.name).join(', ');
    const anzahl = selected.length;

    var query = 'Insert into pool (typ, pokemonliste, anzahl) VALUES(?,?,?)';
    connection.query(query, [type, pokemonListeStr, anzahl]);
    // Rückgabe der gewünschten Anzahl von Pokémon
    return selected;
  } catch (err) {
    console.error('Fehler beim Laden oder Verarbeiten der Datei:', err.message);
    return [];
  }
}

/*const Pokemon = await filterPokemonByType(
  'Fairy',
  ['Uber', 'OU', 'OUBL', 'UUBL', 'UU', 'RUBL'],
  10
);
console.log(`Gefundene Pokémon mit Typ: ${Pokemon.length}`);
Pokemon.forEach((p) => console.log(p.name));*/

async function getPokemonFromPool(type, forbiddenTiers, number) {
  //Übergabevariablen nur für Generierung neuer Pool notwendig
  // Datum von heute im Format YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  const pokemonListe = await new Promise((resolve, reject) => {
    const query = 'SELECT pokemonliste FROM pool WHERE DATE(datum) = ?';
    connection.query(query, [today], function (err, results) {
      if (err) return reject(err);

      if (results.length === 0) {
        // Falls kein Eintrag für heute existiert
        resolve(null);
      } else {
        // Wir nehmen nur das erste Ergebnis (falls mehrere)
        const liste = results[0].pokemonliste.split(',').map((p) => p.trim());
        resolve(liste);
      }
    });
  });

  if (!pokemonListe) {
    console.log('Kein Pool gefunden, generiere neuen...');
    await filterPokemonByType(type, forbiddenTiers, number);
    return 'Pool generiert';
  }

  return pokemonListe;
}

import { generateBattleImage } from './battleRenderer.js';

function getPokemonSprite(pokemonName) {
  const normalizedPokemonName = pokemonName.toLowerCase();

  const allPokemon = Object.values(pokemonData);
  const pokemon = allPokemon.find(
    (p) => p.name.toLowerCase() === normalizedPokemonName
  );

  if (pokemon) {
    return pokemon.sprite;
  } else {
    console.error(
      `Pokémon mit dem Namen "${pokemonName}" wurde nicht gefunden.`
    );
    return null;
  }
}
/*
generateBattleImage(
  {
    name: 'Rayquaza',
    spriteUrl: getPokemonSprite('Rayquaza'),
    hp: 299,
    maxHp: 300,
    status: '',
  },
  {
    name: 'Deoxys',
    spriteUrl: getPokemonSprite('Deoxys'),
    hp: 150,
    maxHp: 190,
    status: '',
  },
  'src/battleImages/fight_scene_' + Date.now() + '.png'
);*/

import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

bot.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = await fs.readdir(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = await fs.readdir(commandsPath);

  for (const file of commandFiles) {
    if (!file.endsWith('.js')) continue;

    const filePath = path.join(commandsPath, file);

    const command = await import(pathToFileURL(filePath).href); // <-- FIX here

    const commandData = command.default;

    if ('data' in commandData && 'execute' in commandData) {
      bot.commands.set(commandData.data.name, commandData);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

bot.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.channel.type != 1) {
    return;
  }
  if (
    interaction.isAutocomplete() &&
    (interaction.commandName === 'lead' || interaction.commandName === 'tutor')
  ) {
    const userId = interaction.user.id;

    const teamResults = await getTeamFromDB(userId); // Funktion siehe unten

    const focused = interaction.options.getFocused();
    const choices = teamResults
      .filter((p) => p.name.toLowerCase().includes(focused.toLowerCase()))
      .slice(0, 25)
      .map((p) => ({ name: p.name, value: p.name }));

    await interaction.respond(choices);
    return;
  } else if (
    interaction.isAutocomplete() &&
    interaction.commandName === 'bag'
  ) {
    const userId = interaction.user.id;
    const focusedOption = interaction.options.getFocused();
    const category = interaction.options.getString('category');

    let choices = [];

    if (category === 'items') {
      var query =
        'SELECT * FROM item where spieler = (Select name from spieler where discordid = ?)';
      var items = await new Promise((resolve, reject) => {
        connection.query(query, [userId], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results);
          }
        });
      });

      choices = items.map((item) => item.name);
    } else if (category === 'tms') {
      var query =
        'SELECT * FROM tm_spieler ts inner join tm on ts.tm = tm.id where spieler = (Select name from spieler where discordid = ?)';
      var tms = await new Promise((resolve, reject) => {
        connection.query(query, [userId], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results);
          }
        });
      });
      choices = tms.map((tm) => tm.id + ': ' + tm.attacke);
    }

    const filtered = choices
      .filter((choice) =>
        choice.toLowerCase().includes(focusedOption.toLowerCase())
      )
      .slice(0, 25)
      .map((choice) => ({ name: choice, value: choice }));

    await interaction.respond(filtered);
    return;
  }
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

async function getTeamFromDB(discordId) {
  return new Promise((resolve, reject) => {
    const query =
      'SELECT name FROM pokemon WHERE spieler = (SELECT name FROM spieler WHERE discordid = ?)';
    connection.query(query, [discordId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}
