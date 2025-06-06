import { getActivePool } from '../database/pool.js';
import { getUserById } from '../database/user.js';
import { createCanvas, loadImage } from 'canvas';
import { createWriteStream } from 'fs';

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

export async function sendBattleImage(trainerPokemon, wildPokemon, userId) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const user = await getUserById(userId);

  const activePool = await getActivePool();
  const backgroundPath = `./src/data/background/${activePool.type.toLowerCase()}.png`;

  const trainerSet = trainerPokemon.set;
  const trainerPath = `./src/data/sprites/${trainerSet.species.toLowerCase()}/${trainerSet.shiny ? 'shiny' : 'default'}/back.gif`;

  const wildSet = wildPokemon.set;
  const wildPath = `./src/data/sprites/${wildSet.species.toLowerCase()}/${wildSet.shiny ? 'shiny' : 'default'}/default.gif`;

  const [background, trainerSprite, wildSprite] = await Promise.all([
    loadImage(backgroundPath),
    loadImage(trainerPath),
    loadImage(wildPath),
  ]);

  ctx.drawImage(background, 0, 0, width, height);

  const leftSize = 220;
  const leftX = 80;
  const leftY = height - leftSize - 40;
  ctx.drawImage(trainerSprite, leftX, leftY, leftSize, leftSize);
  drawHealthBar(
    ctx,
    leftX + 20,
    leftY - 35,
    180,
    25,
    trainerPokemon.hp,
    trainerPokemon.maxHp,
    trainerPokemon.name,
    trainerPokemon.status
  );

  const rightSize = 150;
  const rightX = width - rightSize - 240;
  const rightY = 280;
  ctx.drawImage(wildSprite, rightX, rightY, rightSize, rightSize);
  drawHealthBar(
    ctx,
    rightX - 20,
    rightY - 35,
    180,
    25,
    wildPokemon.hp,
    wildPokemon.maxHp,
    wildPokemon.name,
    wildPokemon.status
  );

  const out = createWriteStream(`./src/data/_generatedImages/${user.name}.png`);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise((resolve, reject) => {
    out.on('finish', () => {
      resolve();
    });
    out.on('error', reject);
  });
}
