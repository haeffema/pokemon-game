import { createCanvas, loadImage } from 'canvas';
import { spawn } from 'child_process';
import { promises as fs } from 'node:fs';
import { getActivePool } from '../database/pool.js';

async function getRandomGifFrameAsPngBuffer(gifPath) {
  let totalFrames;

  try {
    const ffprobeProcess = spawn('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=nb_frames',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      gifPath,
    ]);

    let frameCountOutput = '';
    ffprobeProcess.stdout.on('data', (data) => {
      frameCountOutput += data.toString();
    });

    await new Promise((resolve, reject) => {
      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `ffprobe exited with code ${code} for ${gifPath}. Stderr: ${frameCountOutput}`
            )
          );
        }
      });
      ffprobeProcess.on('error', (err) => {
        reject(new Error(`Failed to start ffprobe: ${err.message}`));
      });
    });

    totalFrames = parseInt(frameCountOutput.trim(), 10);
    if (isNaN(totalFrames) || totalFrames <= 0) {
      throw new Error(
        `Could not determine valid frame count for GIF: ${gifPath}`
      );
    }
  } catch (error) {
    console.error(`Error getting frame count for ${gifPath}:`, error.message);
    throw new Error(`Failed to get GIF frame count: ${error.message}`);
  }

  const randomFrameIndex = Math.floor(Math.random() * totalFrames);

  try {
    const ffmpegProcess = spawn('ffmpeg', [
      '-i',
      gifPath,
      '-vf',
      `select=eq(n\\,${randomFrameIndex})`,
      '-vframes',
      '1',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      '-',
    ]);

    let imageBuffer = Buffer.alloc(0);
    ffmpegProcess.stdout.on('data', (data) => {
      imageBuffer = Buffer.concat([imageBuffer, data]);
    });

    const stderrChunks = [];
    ffmpegProcess.stderr.on('data', (data) => {
      stderrChunks.push(data);
    });

    return new Promise((resolve, reject) => {
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          if (imageBuffer.length > 0) {
            resolve(imageBuffer);
          } else {
            reject(
              new Error(
                `FFmpeg produced an empty image buffer for ${gifPath}. Stderr: ${Buffer.concat(stderrChunks).toString()}`
              )
            );
          }
        } else {
          reject(
            new Error(
              `FFmpeg exited with code ${code} for ${gifPath}. Stderr: ${Buffer.concat(stderrChunks).toString()}`
            )
          );
        }
      });
      ffmpegProcess.on('error', (err) => {
        reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
      });
    });
  } catch (error) {
    console.error(`Error extracting frame from ${gifPath}:`, error.message);
    throw new Error(`Failed to extract random frame: ${error.message}`);
  }
}

function drawHealthBar(ctx, x, y, barWidth, barHeight, pokemon) {
  const percentage = pokemon.hp / pokemon.maxhp;
  let percent = Math.round(percentage * 100);
  if (pokemon.hp > 0 && percent === 0) {
    percent = 1;
  }

  const percentText = `${percent}%`;

  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2.5;
  ctx.strokeText(pokemon.set.name, x + barWidth / 2, y - 5);

  // Fill
  ctx.fillStyle = 'white';
  ctx.fillText(pokemon.set.name, x + barWidth / 2, y - 5);

  ctx.fillStyle = 'gray';
  ctx.fillRect(x, y, barWidth, barHeight);

  const fillWidth = percentage * barWidth;
  ctx.fillStyle = percentage > 0.5 ? 'green' : 'red';
  ctx.fillRect(x, y, fillWidth, barHeight);

  ctx.lineWidth = 1;
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

  const missingSpritePath = './src/data/sprites/missing-sprite.png';

  const trainerGifPath = `./src/data/sprites/${trainerPokemon.species.name.toLowerCase()}/${trainerPokemon.set.shiny ? 'shiny' : 'default'}/back.gif`;
  let trainerImageBuffer;

  if (trainerPokemon.volatiles.substitute) {
    const subBackPath = './src/data/sprites/sub-back.png';
    try {
      trainerImageBuffer = await fs.readFile(subBackPath);
    } catch (error) {
      console.warn(
        `Could not load Sub Back sprite from ${subBackPath}: ${error.message}. Falling back to missing sprite.`
      );
      trainerImageBuffer = await fs.readFile(missingSpritePath);
    }
  } else {
    try {
      trainerImageBuffer = await getRandomGifFrameAsPngBuffer(trainerGifPath);
    } catch (error) {
      console.warn(
        `Could not get random back sprite for ${trainerPokemon.species.name.toLowerCase()}: ${error.message}. Using missing sprite.`
      );
      trainerImageBuffer = await fs.readFile(missingSpritePath);
    }
  }

  let wildImageBuffer;
  if (newPokemon) {
    const pokeBallPath = './src/data/sprites/poke-ball.png';
    try {
      wildImageBuffer = await fs.readFile(pokeBallPath);
    } catch (error) {
      console.warn(
        `Could not load Poké Ball sprite from ${pokeBallPath}: ${error.message}. Falling back to missing sprite.`
      );
      wildImageBuffer = await fs.readFile(missingSpritePath);
    }
  } else if (wildPokemon.volatiles.substitute) {
    const subDefaultPath = './src/data/sprites/sub-default.png';
    try {
      wildImageBuffer = await fs.readFile(subDefaultPath);
    } catch (error) {
      console.warn(
        `Could not load Sub Default sprite from ${subDefaultPath}: ${error.message}. Falling back to missing sprite.`
      );
      wildImageBuffer = await fs.readFile(missingSpritePath);
    }
  } else {
    const wildGifPath = `./src/data/sprites/${wildPokemon.species.name.toLowerCase()}/${wildPokemon.set.shiny ? 'shiny' : 'default'}/default.gif`;
    try {
      wildImageBuffer = await getRandomGifFrameAsPngBuffer(wildGifPath);
    } catch (error) {
      console.warn(
        `Could not get random default sprite for ${wildPokemon.species.name.toLowerCase()}: ${error.message}. Using missing sprite.`
      );
      wildImageBuffer = await fs.readFile(missingSpritePath);
    }
  }

  const [background, trainerSprite, wildSprite] = await Promise.all([
    loadImage(backgroundPath),
    loadImage(trainerImageBuffer),
    loadImage(wildImageBuffer),
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
