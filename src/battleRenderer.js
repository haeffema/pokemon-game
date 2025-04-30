import { createCanvas, loadImage } from 'canvas';
import { createWriteStream } from 'fs';

const width = 800;
const height = 600;

function drawHealthBar(ctx, x, y, width, height, hp, maxHp, name, status) {
  const percentage = hp / maxHp;
  const percentText = `${Math.round(percentage * 100)}%`;

  // Name oben zentriert
  ctx.fillStyle = 'black';
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

  const backgroundURL =
    'https://preview.redd.it/d9spuwer2c491.png?width=1050&format=png&auto=webp&s=9ca8c75c63da9f8bb134e955d73e2770d073375e';

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
  drawHealthBar(ctx, leftX + 20, leftY - 35, 180, 25, leftPokemon.hp, leftPokemon.maxHp, leftPokemon.name, leftPokemon.status);

  const rightSize = 150;
  const rightX = width - rightSize - 200;
  const rightY = 180;
  ctx.drawImage(rightSprite, rightX, rightY, rightSize, rightSize);
  drawHealthBar(ctx, rightX - 20, rightY - 35, 180, 25, rightPokemon.hp, rightPokemon.maxHp, rightPokemon.name, rightPokemon.status);

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
  Events
} from 'discord.js';

import bot from './utils/client.js';
export async function sendUserBattleState(userid, battleState, wildPokemon) {
  try {
    const imagePath = battleState.image;
    const attachment = new AttachmentBuilder(imagePath);
    await bot.users.send(userid, { files: [attachment] });

    if (battleState.winner) {
      const winnerText =
        battleState.winner === 'Trainer'
          ? 'Du hast den Kampf gewonnen und das wilde Pokemon gefangen!'
          : 'Das wilde Pokémon hat den Kampf gewonnen und ist geflüchtet.';

      const embed = new EmbedBuilder()
        .setTitle('Kampf beendet')
        .setDescription(winnerText)
        .setColor(battleState.winner === 'Trainer' ? 0x00ff00 : 0xff0000);

      await bot.users.send(userid, { embeds: [embed] });
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
      interaction.customId.startsWith('move_') && interaction.user.id === userid;

    const collected = await message
      .awaitMessageComponent({
        filter,
        time: 15 * 60 * 1000,
      })
      .catch(() => null);

    if (!collected) {
      console.log('Keine Auswahl getroffen.');
      return null;
    }

    await collected.deferUpdate();
    const moveId = parseInt(collected.customId.split('_')[1]);
    return moveId;
  } catch (err) {
    console.error('Fehler beim Senden des BattleStates', err);
    return null;
  }
}

