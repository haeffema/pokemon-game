import { createCanvas, loadImage } from 'canvas';
import { createWriteStream } from 'fs';

import pokemonData from './data/pokemon.json' with { type: 'json' };
import droppableItems from './data/droppable_items.json' with { type: 'json' };
const droppableArray = Object.values(droppableItems);
import connection from '../src/utils/databaseConnection.js';

const width = 800;
const height = 600;

function drawHealthBar(ctx, x, y, width, height, hp, maxHp, name, status) {
  const percentage = hp / maxHp;
  let percent = Math.round(percentage * 100);
  if (hp > 0 && percent === 0) {
    percent = 1;
  }

  const percentText = `${percent}%`;

  // Name oben zentriert
  ctx.fillStyle = 'white';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, x + width / 2, y - 5);

  // Bar-Hintergrund
  ctx.fillStyle = 'gray';
  ctx.fillRect(x, y, width, height);

  // Bar-Füllung
  const fillWidth = percentage * width;
  ctx.fillStyle = percentage > 0.5 ? 'green' : 'red';
  ctx.fillRect(x, y, fillWidth, height);

  // Bar-Rahmen
  ctx.strokeStyle = 'black';
  ctx.strokeRect(x, y, width, height);

  // Prozentwert in der Bar, rechtsbündig
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(percentText, x + width - 5, y + height / 2);

  // Statusanzeige, falls vorhanden
  if (status) {
    const statusUpper = status.toUpperCase();
    let statusColor;

    // Bestimmen der Farbe des Status
    switch (statusUpper) {
      case 'TOX':
        statusColor = 'purple';
        break;
      case 'BRN':
        statusColor = 'red';
        break;
      case 'PAR':
        statusColor = 'yellow';
        break;
      case 'SLP':
        statusColor = 'pink';
        break;
      case 'FRZ':
        statusColor = 'lightblue';
        break;
      default:
        statusColor = 'gray';
    }

    // Kasten für Statusanzeige
    const statusBoxWidth = 50;
    const statusBoxHeight = 20;
    ctx.fillStyle = statusColor;
    ctx.fillRect(x, y + height, statusBoxWidth, statusBoxHeight);

    // Status-Text in der Mitte des Kastens
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      statusUpper,
      x + statusBoxWidth / 2,
      y + height + statusBoxHeight / 2
    );
  }
}

export async function generateBattleImage(
  leftPokemon,
  rightPokemon,
  outputPath = 'pokemon_battle.png'
) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  var query = `
        SELECT typ from poolTag where aktiv = 1;`;
  var poolTag = await new Promise((resolve, reject) => {
    connection.query(query, function (err, results) {
      if (err) {
        reject('Datenbankfehler: ' + err);
      } else {
        resolve(results[0]);
      }
    });
  });
  //var backgroundURL = 'src/data/background/grass.png';
  var backgroundURL =
    'src/data/background/' + poolTag.typ.toLowerCase() + '.png';

  const [background, leftSprite, rightSprite] = await Promise.all([
    loadImage(backgroundURL),
    loadImage(leftPokemon.spriteUrl),
    loadImage(rightPokemon.spriteUrl),
  ]);

  ctx.drawImage(background, 0, 0, width, height);

  const leftSize = 220;
  const leftX = 80;
  const leftY = height - leftSize - 40;
  ctx.drawImage(leftSprite, leftX, leftY, leftSize, leftSize);
  drawHealthBar(
    ctx,
    leftX + 20,
    leftY - 35,
    180,
    25,
    leftPokemon.hp,
    leftPokemon.maxHp,
    leftPokemon.name,
    leftPokemon.status
  );

  const rightSize = 150;
  const rightX = width - rightSize - 200;
  const rightY = 180;
  ctx.drawImage(rightSprite, rightX, rightY, rightSize, rightSize);
  drawHealthBar(
    ctx,
    rightX - 20,
    rightY - 35,
    180,
    25,
    rightPokemon.hp,
    rightPokemon.maxHp,
    rightPokemon.name,
    rightPokemon.status
  );

  const out = createWriteStream(outputPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise((resolve, reject) => {
    out.on('finish', () => {
      console.log(`✅ Bild gespeichert unter: ${outputPath}`);
      resolve(); // Jetzt ist das Bild wirklich fertig
    });
    out.on('error', reject);
  });
}

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
  Events,
} from 'discord.js';

import bot from './utils/client.js';
export async function sendUserBattleState(userid, battleState, wildPokemon) {
  console.log(battleState.roundLog);
  try {
    const imagePath = battleState.image;
    const attachment = new AttachmentBuilder(imagePath);
    await bot.users.send(userid, { files: [attachment] });
    /*fs.unlink(imagePath, (err) => {
      if (err) {
          console.error('Fehler beim Löschen der Datei:', err);
          return;
      }
      console.log('Datei erfolgreich gelöscht:', imagePath);
  });*/
    if (battleState.roundLog)
      await bot.users.send(userid, battleState.roundLog);

    if (battleState.winner) {
      const winnerText =
        battleState.winner === 'Trainer'
          ? 'Du hast den Kampf gewonnen!'
          : 'Das wilde Pokémon hat den Kampf gewonnen und ist geflüchtet.';

      const embed = new EmbedBuilder()
        .setTitle('Kampf beendet')
        .setDescription(winnerText)
        .setColor(battleState.winner === 'Trainer' ? 0x00ff00 : 0xff0000);

      await bot.users.send(userid, { embeds: [embed] });
      if (battleState.winner === 'Trainer')
        pokemonDefeated(userid, wildPokemon);
      return battleState.winner;
    }

    // Wenn noch kein Gewinner: Buttons zeigen
    const moves = battleState.moves.slice(0, 4);
    const embed = new EmbedBuilder()
      .setTitle('Wähle deinen nächsten Move!')
      .setDescription('Bitte wähle einen deiner verfügbaren Moves aus:')
      .setColor(0x00aeff);

    const buttons = moves.map((move) =>
      new ButtonBuilder()
        .setCustomId(`move_${move.id}`)
        .setLabel(move.name)
        .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    const message = await bot.users.send(userid, {
      embeds: [embed],
      components: [row],
    });

    const filter = (interaction) =>
      interaction.customId.startsWith('move_') &&
      interaction.user.id === userid;

    const collected = await message.awaitMessageComponent({
      filter,
      time: 3 * 60 * 1000,
    });
    if (!collected) {
      console.log('Keine Auswahl getroffen.');
      return null;
    }

    await collected.deferUpdate();
    const moveId = parseInt(collected.customId.split('_')[1]);
    return moveId;
  } catch (err) {
    await bot.users.send(
      userid,
      '⏳ Deine Zeit ist abgelaufen. Das wilde Pokémon hat den Kampf gewonnen und ist geflüchtet.'
    );
    return null;
  }
}

async function pokemonDefeated(userid, pokepaste) {
  const firstLine = pokepaste.trim().split('\n')[0];
  const name = firstLine.split(' @ ')[0].trim();
  const normalizedPokemonName = name.toLowerCase();

  const allPokemon = Object.values(pokemonData);
  const wildPokemon = allPokemon.find(
    (p) => p.name.toLowerCase() === normalizedPokemonName
  );
  var tier = wildPokemon.tier;
  var pokepasteWithoutItem = removeItemsFromPokepaste(pokepaste);
  console.log(pokepasteWithoutItem);
  var query =
    'Insert ignore into pokemon (name, Spieler, pokepaste) Values (?,(Select name from spieler where discordid= ? ),?)';
  connection.query(
    query,
    [name, userid, pokepasteWithoutItem],
    (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        return;
      }
      console.log(results.affectedRows);
    }
  );

  var loot = await calculateLoot(tier);
  console.log(loot);

  if (loot.item == null) {
    bot.users.send(
      userid,
      'Du hast das Pokemon erfolgreich besiegt und gefangen! Du hast ' +
        loot.gold +
        ' PokéDollar erhalten!'
    );
  } else {
    bot.users.send(
      userid,
      'Du hast das Pokemon erfolgreich besiegt! Du hast ' +
        loot.gold +
        ' PokéDollar erhalten! Außerdem hat das wilde Pokemon ein neues Item fallen gelassen!'
    );
    const embed = new EmbedBuilder()
      .setTitle(loot.item)
      .setDescription(loot.description)
      .setThumbnail(loot.sprite);
    bot.users.send(userid, {
      embeds: [embed],
    });
    var query =
      'Insert into item (name, spieler, beschreibung, sprite) VALUES(?,(Select name from spieler where discordid= ? ),?,?)';
    connection.query(
      query,
      [loot.item, userid, loot.description, loot.sprite],
      (err, results) => {
        if (err) {
          console.error('Error executing query:', err);
          return;
        }
        console.log(results.affectedRows);
      }
    );
  }
  var query = 'Update spieler set geld = geld + ? where discordid = ?';
  connection.query(query, [loot.gold, userid]);
}

function removeItemsFromPokepaste(pokepaste) {
  return pokepaste
    .split('\n')
    .map((line) => {
      // Wenn ein @ in der Zeile vorkommt, entferne alles ab dem @
      if (line.includes('@')) {
        return line.split('@')[0].trim();
      }
      return line;
    })
    .join('\n');
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
    const query = 'SELECT name FROM item WHERE spieler = ?';
    connection.query(query, ['Jan'], function (err, results) {
      if (err) return reject(err);
      const ownedNames = results.map((row) => row.name);
      resolve(ownedNames);
    });
  });

  // Alle Items, die der Spieler noch nicht hat
  const availableItems = droppableArray.filter(
    (item) => !ownedItems.includes(item.name)
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

function getBaseGold(tier) {
  const normalizedTier = tier.trim().toUpperCase();

  if (['NUBL', 'RU'].includes(normalizedTier)) return 100;
  if (['RUBL', 'UU'].includes(normalizedTier)) return 200;
  if (['UUBL', 'OU'].includes(normalizedTier)) return 300;
  if (['OUBL', 'UBER'].includes(normalizedTier)) return 500;

  return 50;
}
