
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
  Collection
} from 'discord.js';

const bot = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel],
});

import config from './utils/config.json' assert { type: 'json' };

const { token, clientId } = config;

bot.login(
  token
);

bot.once('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

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
    const pokemonListeStr = selected.map(p => p.name).join(', ');
    const anzahl = selected.length;


    var query = "Insert into pool (typ, pokemonliste, anzahl) VALUES(?,?,?)";
    connection.query(query, [type, pokemonListeStr, anzahl])
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


async function getPokemonFromPool(type, forbiddenTiers, number) { //Übergabevariablen nur für Generierung neuer Pool notwendig
  // Datum von heute im Format YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  const pokemonListe = await new Promise((resolve, reject) => {
    const query = "SELECT pokemonliste FROM pool WHERE DATE(datum) = ?";
    connection.query(query, [today], function (err, results) {
      if (err) return reject(err);

      if (results.length === 0) {
        // Falls kein Eintrag für heute existiert
        resolve(null);
      } else {
        // Wir nehmen nur das erste Ergebnis (falls mehrere)
        const liste = results[0].pokemonliste.split(',').map(p => p.trim());
        resolve(liste);
      }
    });
  });

  if (!pokemonListe) {
    console.log("Kein Pool gefunden, generiere neuen...");
    await filterPokemonByType(type,
      forbiddenTiers,
      number);
    return "Pool generiert"
  }

  return pokemonListe;
}
var pokemonListe = await getPokemonFromPool("Fire", ['Uber', 'OUBL', 'UUBL', 'UU', 'RUBL', 'RU', 'NUBL', 'NU', 'ZUBL', 'ZU', 'PUBL', 'PU'], 10)
console.log(pokemonListe)


const droppableArray = Object.values(droppableItems);

function getBaseGold(tier) {
  const normalizedTier = tier.trim().toUpperCase();

  if (['NUBL', 'RU'].includes(normalizedTier)) return 100;
  if (['RUBL', 'UU'].includes(normalizedTier)) return 200;
  if (['UUBL', 'OU'].includes(normalizedTier)) return 300;
  if (['OUBL', 'UBER'].includes(normalizedTier)) return 500;

  return 50;
}
async function calculateLoot(defeatedPokemonTier) {
  const baseGold = getBaseGold(defeatedPokemonTier);
  const bonus = Math.floor(Math.random() * 41) - 20;
  const gold = Math.max(0, baseGold + bonus);

  let item = null;
  let description = null;
  let sprite = null;

  // Datenbankabfrage: Welche Items besitzt der Spieler schon?
  const ownedItems = await new Promise((resolve, reject) => {
    const query = "SELECT name FROM item WHERE spieler = ?";
    connection.query(query, ["Jan"], function (err, results) {
      if (err) return reject(err);
      const ownedNames = results.map(row => row.name);
      resolve(ownedNames);
    });
  });

  // Alle Items, die der Spieler noch nicht hat
  const availableItems = droppableArray.filter(
    item => !ownedItems.includes(item.name)
  );

  // Dropchance
  const dropChance = Math.random();
  if (dropChance <= 0.1 && availableItems.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    const dropped = availableItems[randomIndex];
    item = dropped.name;
    description = dropped.description;
    sprite = dropped.sprite;
  }

  return {
    gold: gold,
    item: item,
    description: description,
    sprite: sprite,
  };
}

async function pokemonDefeated(pokemon, player, set, tier) {

  var query = "Insert ignore into pokemon (name, Spieler, pokepaste) Values (?,?,?)"
  connection.query(query, [pokemon, player, set], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return;
    }
    console.log(results.affectedRows)
  })

  var loot = await calculateLoot(tier);
  console.log(loot);

  if (loot.item == null) {
    bot.users.send(
      '360366344635547650',
      'Du hast das Pokemon erfolgreich besiegt und gefangen! Du hast ' +
      loot.gold +
      ' Gold erhalten!'
    );
  } else {
    bot.users.send(
      '360366344635547650',
      'Du hast das Pokemon erfolgreich besiegt! Du hast ' +
      loot.gold +
      ' Gold erhalten! Außerdem hat das wilde Pokemon ein neues Item fallen gelassen!'
    );
    const embed = new EmbedBuilder()
      .setTitle(loot.item)
      .setDescription(loot.description)
      .setThumbnail(loot.sprite);
    bot.users.send('360366344635547650', {
      embeds: [embed],
    });
    var query = "Insert into item (name, spieler, beschreibung, sprite) VALUES(?,?,?,?)"
    connection.query(query, [loot.item, player, loot.description, loot.sprite], (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return;
      }
      console.log(results.affectedRows)
    })
  }
}

var pokepaste = `Blacephalon @ Choice Specs
Ability: Beast Boost
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
IVs: 0 Atk
- Shadow Ball
- Fire Blast
- Dark Pulse
- Psyshock`;

await pokemonDefeated("Blacephalon", "Jan", pokepaste, "OU");

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
);

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
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

bot.on(Events.InteractionCreate, async interaction => {
  //if (!interaction.isChatInputCommand()) return;
  if (interaction.isAutocomplete() && interaction.commandName === 'lead') {
    const userId = interaction.user.id;

    const teamResults = await getTeamFromDB(userId); // Funktion siehe unten

    const focused = interaction.options.getFocused();
    const choices = teamResults
      .filter(p => p.name.toLowerCase().includes(focused.toLowerCase()))
      .slice(0, 25)
      .map(p => ({ name: p.name, value: p.name }));

    await interaction.respond(choices);
    return;
  }
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    }
  }
});

async function getTeamFromDB(discordId) {
  return new Promise((resolve, reject) => {
    const query = "SELECT name FROM pokemon WHERE spieler = (SELECT name FROM spieler WHERE discordid = ?)";
    connection.query(query, [discordId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}