import { getActivePool } from '../database/pool.js';
import { createCanvas, loadImage } from 'canvas';
import { access, constants, readdir } from 'node:fs/promises';
import path from 'path';

async function getRandomSpriteFilename(spriteDir, prefix) {
  try {
    const files = await readdir(spriteDir);
    const filteredFiles = files.filter(
      (file) => file.startsWith(`${prefix}-`) && file.endsWith('.png')
    );

    if (filteredFiles.length === 0) {
      console.warn(
        `No sprites found matching "${prefix}-*.png" in ${spriteDir}`
      );
      return null;
    }

    const randomIndex = Math.floor(Math.random() * filteredFiles.length);
    return filteredFiles[randomIndex];
  } catch (error) {
    console.error(`Error reading sprite directory ${spriteDir}:`, error);
    return null;
  }
}

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
      case 'PSN':
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

export async function generateBattleImage(
  trainerPokemon,
  wildPokemon,
  newPokemon
) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const activePool = await getActivePool();
  const backgroundPath = `./src/data/background/${activePool.type.toLowerCase()}.png`;

  const trainerSet = trainerPokemon.set;
  const wildSet = wildPokemon.set;

  const trainerSpriteDir = `./src/data/sprites/${trainerPokemon.species.name.toLowerCase()}/${trainerSet.shiny ? 'shiny' : 'default'}`;
  const wildSpriteDir = `./src/data/sprites/${wildPokemon.species.name.toLowerCase()}/${wildSet.shiny ? 'shiny' : 'default'}`;

  let trainerSpriteFilename = await getRandomSpriteFilename(
    trainerSpriteDir,
    'back'
  );
  let wildSpriteFilename = await getRandomSpriteFilename(
    wildSpriteDir,
    'default'
  );

  let trainerPath = trainerSpriteFilename
    ? path.join(trainerSpriteDir, trainerSpriteFilename)
    : null;
  let wildPath = wildSpriteFilename
    ? path.join(wildSpriteDir, wildSpriteFilename)
    : null;

  if (newPokemon) {
    wildPath = './src/data/sprites/poke-ball.png';
  }

  const missingSpritePath = './src/data/sprites/missing-sprite.png';

  if (!trainerPath) {
    console.warn(
      `No random back sprite found for ${trainerPokemon.species.name.toLowerCase()}. Using missing sprite.`
    );
    trainerPath = missingSpritePath;
  } else {
    try {
      await access(trainerPath, constants.F_OK);
    } catch (error) {
      console.warn(
        `Randomly selected trainer sprite ${trainerPath} not found:\n${error}`
      );
      trainerPath = missingSpritePath;
    }
  }

  if (!wildPath) {
    console.warn(
      `No random default sprite found for ${wildPokemon.species.name.toLowerCase()}. Using missing sprite.`
    );
    wildPath = missingSpritePath;
  } else {
    try {
      await access(wildPath, constants.F_OK);
    } catch (error) {
      console.warn(
        `Randomly selected wild sprite ${wildPath} not found:\n${error}`
      );
      wildPath = missingSpritePath;
    }
  }

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

  return new Promise((resolve, reject) => {
    canvas.toBuffer((err, buffer) => {
      if (err) {
        return reject(err);
      }
      resolve(buffer);
    });
  });
}

export async function generateBadgeImage(badges) {
  const widthPerBadge = 40;
  const height = 40;
  const total = 8;

  const canvas = createCanvas(widthPerBadge * total, height);
  const ctx = canvas.getContext('2d');

  const badgeImages = await Promise.all(
    Array.from({ length: total }, async (_, i) => {
      return await loadImage(`./src/data/badges/badge${i + 1}.png`);
    })
  );

  const empty = await loadImage('./src/data/badges/empty.png');

  for (let i = 0; i < total; i++) {
    const img = i < badges ? badgeImages[i] : empty;
    ctx.drawImage(img, i * widthPerBadge, 0, widthPerBadge, height);
  }

  return new Promise((resolve, reject) => {
    canvas.toBuffer((err, buffer) => {
      if (err) {
        return reject(err);
      }
      resolve(buffer);
    });
  });
}
