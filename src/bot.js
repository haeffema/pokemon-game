import dotenv from 'dotenv';
dotenv.config();

import cron from 'cron';
import util from 'util';
import { v4 as uuid } from 'uuid';
import QuickChart from 'quickchart-js';
import { exec } from 'child_process';
import { EventEmitter } from 'events';

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

bot.login(
  'MTAzMTU3NjA3MzM2NTg4OTEzNg.GG03-y.WObE98M9wY0ncbK6uN4WU-ENmGrMg5qJRfwOiM'
);

bot.once('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

import mysql from 'mysql';
import { NULL } from 'mysql/lib/protocol/constants/types.js';
import { log } from 'console';
import { deserialize } from 'v8';

// MySQL-Verbindung
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  port: 3307,
  password: null,
  database: 'pokemongame',
  multipleStatements: true,
});

connection.connect((err) => {
  if (err) {
    console.log(err.code);
    console.log(err.fatal);
  } else {
    console.log('Connection to Database successful!');
  }
});

import showdown from 'pokemon-showdown';
const { Dex } = showdown;

const pokedex = Dex.forGen(7);

import { readFile } from 'fs/promises';

async function filterPokemonByType(type, forbiddenTiers, number) {
  try {
    const data = await readFile('src/pokemon/data.json', 'utf8');
    const pokemonObj = JSON.parse(data);

    const allPokemon = Object.values(pokemonObj);
   // Filtern mit optionalem Typ
   const filtered = allPokemon.filter(p =>
    (!type || p.types.includes(type)) &&
    !forbiddenTiers.includes(p.tier)
);

  // Mischen des Arrays mit dem Fisher-Yates-Algorithmus
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
}

// Rückgabe der gewünschten Anzahl von Pokémon
return filtered.slice(0, number);

  } catch (err) {
    console.error('Fehler beim Laden oder Verarbeiten der Datei:', err.message);
    return [];
  }
}

const Pokemon = await filterPokemonByType('Fire', ["Uber","OU","UUBL","UU","RUBL"], 20);
console.log(`Gefundene Pokémon mit Typ: ${Pokemon.length}`);
Pokemon.forEach(p => console.log(p.name));

function calculateLoot() {
  const minGold = 100;
  const maxGold = 200;
  const loot = Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;
  return loot;
}

const gold = calculateLoot();
console.log(`Du hast ${gold} Gold gefunden!`);