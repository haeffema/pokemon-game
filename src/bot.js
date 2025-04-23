import dotenv from 'dotenv';
dotenv.config();

import cron from 'cron';
import util from 'util';
import { v4 as uuid } from 'uuid';
import QuickChart from 'quickchart-js';
import { exec } from 'child_process';
import { EventEmitter } from 'events';

import pokemonData from './pokemon/data/pokemon.json' with { type: 'json' };
import droppableItems from './pokemon/data/droppable_items.json' with { type: 'json' };

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

async function filterPokemonByType(type, forbiddenTiers, number) {
  try {
    const pokemonObj = JSON.parse(pokemonData);

    const allPokemon = Object.values(pokemonObj);
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

    // Rückgabe der gewünschten Anzahl von Pokémon
    return filtered.slice(0, number);
  } catch (err) {
    console.error('Fehler beim Laden oder Verarbeiten der Datei:', err.message);
    return [];
  }
}

const Pokemon = await filterPokemonByType(
  'Fire',
  ['Uber', 'OU', 'UUBL', 'UU', 'RUBL'],
  20
);
console.log(`Gefundene Pokémon mit Typ: ${Pokemon.length}`);
Pokemon.forEach((p) => console.log(p.name));

const droppableArray = Object.values(droppableItems);

function getBaseGold(tier) {
  const normalizedTier = tier.trim().toUpperCase();

  if (['NUBL', 'RU'].includes(normalizedTier)) return 100;
  if (['RUBL', 'UU'].includes(normalizedTier)) return 200;
  if (['UUBL', 'OU'].includes(normalizedTier)) return 300;
  if (['OUBL', 'UBER'].includes(normalizedTier)) return 500;

  return 50;
}

function calculateLoot(defeatedPokemonTier) {
  const baseGold = getBaseGold(defeatedPokemonTier);
  const bonus = Math.floor(Math.random() * 41) - 20;
  const gold = Math.max(0, baseGold + bonus);

  let item = null;
  let description = null;
  let sprite = null;
  const dropChance = Math.random();
  if (dropChance <= 1) {
    const randomIndex = Math.floor(Math.random() * droppableArray.length);
    item = droppableArray[randomIndex].name;
    description = droppableArray[randomIndex].description;
    sprite = droppableArray[randomIndex].sprite;
  }

  return {
    gold: gold,
    item: item,
    description: description,
    sprite: sprite
  };
}

var loot = calculateLoot('NU');
console.log(loot);

if(loot.item == null){
  bot.users.send("326305842427330560", "Du hast das Pokemon erfolgreich besiegt und gefangen! Du hast "+ loot.gold+ " Gold erhalten!");
} 
else{

  bot.users.send("360366344635547650", "Du hast das Pokemon erfolgreich besiegt! Du hast "+ loot.gold+ " Gold erhalten! Außerdem hat das wilde Pokemon ein neues Item fallen gelassen!");
  const embed = new EmbedBuilder()
  .setTitle(loot.item)
  .setDescription(loot.description)
  .setThumbnail(loot.sprite)
  bot.users
  .send("360366344635547650", {
    embeds: [embed],
  })
} 
