import { getActivePool } from '../database/pool.js';
import { getUserById } from '../database/user.js';
import { createCanvas, loadImage } from 'canvas';
import { createWriteStream } from 'fs';

const width = 800;
const height = 600;

function drawHealthBar(ctx, x, y, barWidth, barHeight, pokemon) {
  const percentage = pokemon.hp / pokemon.maxhp;
  let percent = Math.round(percentage * 100);
  if (pokemon.hp > 0 && percent === 0) {
    percent = 1;
  }

  const percentText = `${percent}%`;

  ctx.fillStyle = 'white';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(pokemon.species.name, x + barWidth / 2, y - 5);

  ctx.fillStyle = 'gray';
  ctx.fillRect(x, y, barWidth, barHeight);

  const fillWidth = percentage * barWidth;
  ctx.fillStyle = percentage > 0.5 ? 'green' : 'red';
  ctx.fillRect(x, y, fillWidth, barHeight);

  ctx.strokeStyle = 'black';
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(percentText, x + barWidth - 5, y + barHeight / 2);

  if (pokemon.status !== '') {
    const statusUpper = pokemon.status.toUpperCase();
    let statusColor;

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

    const statusBoxWidth = 50;
    const statusBoxHeight = 20;
    ctx.fillStyle = statusColor;
    ctx.fillRect(x, y + barHeight, statusBoxWidth, statusBoxHeight);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      statusUpper,
      x + statusBoxWidth / 2,
      y + barHeight + statusBoxHeight / 2
    );
  }
}

export async function sendBattleImage(trainerPokemon, wildPokemon, userId) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const user = await getUserById(userId);

  const activePool = await getActivePool();
  const backgroundPath = `./src/data/background/${activePool.type}.png`;

  const trainerSet = trainerPokemon.set;
  const trainerPath = `./src/data/sprites/${trainerSet.species.toLowerCase()}/${trainerSet.shiny ? 'shiny' : 'default'}/back.png`;

  const wildSet = wildPokemon.set;
  const wildPath = `./src/data/sprites/${wildSet.species.toLowerCase()}/${wildSet.shiny ? 'shiny' : 'default'}/default.png`;

  const [background, trainerSprite, wildSprite] = await Promise.all([
    loadImage(backgroundPath),
    loadImage(trainerPath),
    loadImage(wildPath),
  ]);

  ctx.drawImage(background, 0, 0, width, height);

  const healthBarPadding = 10;

  const healthBarWidth = 180;
  const healthBarHeight = 25;

  const trainerScaleFactor = 2.0;
  const scaledTrainerWidth = trainerSprite.width * trainerScaleFactor;
  const scaledTrainerHeight = trainerSprite.height * trainerScaleFactor;

  const trainerSpriteBottomLeftX = 150;
  const trainerSpriteBottomLeftY = height - 95;

  const trainerSpriteX = trainerSpriteBottomLeftX;
  const trainerSpriteY = trainerSpriteBottomLeftY - scaledTrainerHeight;
  ctx.drawImage(
    trainerSprite,
    trainerSpriteX,
    trainerSpriteY,
    scaledTrainerWidth,
    scaledTrainerHeight
  );

  const trainerBarX =
    trainerSpriteX + scaledTrainerWidth / 2 - healthBarWidth / 2;
  const trainerBarY = trainerSpriteY - healthBarPadding - healthBarHeight;
  drawHealthBar(
    ctx,
    trainerBarX,
    trainerBarY,
    healthBarWidth,
    healthBarHeight,
    trainerPokemon
  );

  const wildScaleFactor = 1.45;
  const scaledWildWidth = wildSprite.width * wildScaleFactor;
  const scaledWildHeight = wildSprite.height * wildScaleFactor;

  const wildSpriteBottomRightX = width - 170;
  const wildSpriteBottomRightY = height - 180;

  const wildSpriteX = wildSpriteBottomRightX - scaledWildWidth;
  const wildSpriteY = wildSpriteBottomRightY - scaledWildHeight;
  ctx.drawImage(
    wildSprite,
    wildSpriteX,
    wildSpriteY,
    scaledWildWidth,
    scaledWildHeight
  );

  const wildBarX = wildSpriteX + scaledWildWidth / 2 - healthBarWidth / 2;
  const wildBarY = wildSpriteY - healthBarPadding - healthBarHeight;
  drawHealthBar(
    ctx,
    wildBarX,
    wildBarY,
    healthBarWidth,
    healthBarHeight,
    wildPokemon
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
