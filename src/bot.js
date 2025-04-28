
import cron from 'cron';
import util from 'util';
import { v4 as uuid } from 'uuid';
import QuickChart from 'quickchart-js';
import { exec } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'node:fs';
import path from'node:path';

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

import config from './config.json' assert { type: 'json' };

const { token, clientId } = config;

bot.login(
  token
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
  port: 3306,
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

var pokemonListe = await getPokemonFromPool("Fire", ['Uber', 'OU', 'OUBL', 'UUBL', 'UU', 'RUBL'], 10)
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

var loot = calculateLoot('NU');
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

generateBattleImage(
  {
    name: 'Jirachi',
    spriteUrl: getPokemonSprite('Jirachi'),
    hp: 223,
    maxHp: 300,
    status: 'FRZ',
  },
  {
    name: 'Simisage',
    spriteUrl: getPokemonSprite('Simisage'),
    hp: 84,
    maxHp: 120,
    status: 'TOX',
  },
  'src/battleImages/fight_scene_' + Date.now() + '.png'
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

bot.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(filePath); // Dynamisches import()

		// Beachte: import() liefert ein Modul-Objekt mit .default
		const commandData = command.default;

		if ('data' in commandData && 'execute' in commandData) {
			bot.commands.set(commandData.data.name, commandData);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

bot.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.bot.commands.get(interaction.commandName);

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