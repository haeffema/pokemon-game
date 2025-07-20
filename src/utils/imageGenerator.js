import { createCanvas, loadImage } from 'canvas';
import { spawn } from 'child_process';
import { promises as fs } from 'node:fs';
import { getActivePool } from '../database/pool.js';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';

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

function drawHealthBar(
  ctx,
  spriteX,
  spriteY,
  scaledSpriteWidth,
  scaledSpriteHeight,
  pokemon,
  activePoolType
) {
  const healthBarPadding = 10;
  const healthBarWidth = 180;
  const healthBarHeight = 25;
  const nameFontSize = 18;
  const percentFontSize = 16;
  const statusFontSize = 14;
  const statusBoxWidth = 50;
  const statusBoxHeight = 20;

  const barX = spriteX + scaledSpriteWidth / 2 - healthBarWidth / 2;
  const barY = spriteY - healthBarPadding - healthBarHeight;

  const darkFontBackgrounds = [
    'Electric',
    'Flying',
    'Grass',
    'Ice',
    'Normal',
    'Rock',
  ];
  const darkFont = darkFontBackgrounds.includes(activePoolType);

  const percentage = pokemon.hp / pokemon.maxhp;
  let percent = Math.round(percentage * 100);
  if (pokemon.hp > 0 && percent === 0) {
    percent = 1;
  }

  const percentText = `${percent}%`;

  ctx.font = `bold ${nameFontSize}px Roboto`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'white';

  if (darkFont) {
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'black';
  }

  ctx.lineWidth = 1;
  ctx.strokeText(pokemon.set.name, barX + healthBarWidth / 2, barY - 5);
  ctx.fillText(pokemon.set.name, barX + healthBarWidth / 2, barY - 5);

  ctx.fillStyle = 'gray';
  ctx.fillRect(barX, barY, healthBarWidth, healthBarHeight);

  const fillWidth = percentage * healthBarWidth;
  ctx.fillStyle = 'green';
  if (percentage < 0.5) {
    ctx.fillStyle = 'orange';
  }
  if (percentage < 0.2) {
    ctx.fillStyle = 'red';
  }
  ctx.fillRect(barX, barY, fillWidth, healthBarHeight);

  ctx.strokeStyle = 'black';
  ctx.strokeRect(barX, barY, healthBarWidth, healthBarHeight);

  ctx.fillStyle = 'white';
  ctx.font = `${percentFontSize}px Roboto`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    percentText,
    barX + healthBarWidth - 5,
    barY + healthBarHeight / 2
  );

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

    ctx.fillStyle = statusColor;
    ctx.fillRect(barX, barY + healthBarHeight, statusBoxWidth, statusBoxHeight);

    ctx.fillStyle = 'white';
    ctx.font = `bold ${statusFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      statusUpper,
      barX + statusBoxWidth / 2,
      barY + healthBarHeight + statusBoxHeight / 2
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

  drawHealthBar(
    ctx,
    trainerSpriteX,
    trainerSpriteY,
    scaledTrainerWidth,
    scaledTrainerHeight,
    trainerPokemon,
    activePool.type
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

  drawHealthBar(
    ctx,
    wildSpriteX,
    wildSpriteY,
    scaledWildWidth,
    scaledWildHeight,
    wildPokemon,
    activePool.type
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

async function getGifDuration(filePath, defaultDuration = 2) {
  return new Promise((resolve) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      (error, stdout, stderr) => {
        if (
          error ||
          !stdout ||
          isNaN(parseFloat(stdout)) ||
          parseFloat(stdout) === 0
        ) {
          console.warn(
            `Could not get duration for ${filePath}, assuming ${defaultDuration}s. Error: ${error?.message || stderr}`
          );
          return resolve(defaultDuration);
        }
        resolve(parseFloat(stdout));
      }
    );
  });
}

export async function generateBattleGif(
  trainerPokemon,
  wildPokemon,
  newPokemon
) {
  const tempId = uuidv4();
  const tempDir = path.join(tmpdir(), `battle-${tempId}`);
  await fs.mkdir(tempDir);

  try {
    const activePool = await getActivePool();
    const backgroundPath = `./src/data/background/${activePool.type.toLowerCase()}.png`;
    const missingSpritePath = './src/data/sprites/missing-sprite.png';

    const trainerGifPath = trainerPokemon.volatiles.substitute
      ? './src/data/sprites/sub-back.png'
      : `./src/data/sprites/${trainerPokemon.species.name.toLowerCase()}/${trainerPokemon.set.shiny ? 'shiny' : 'default'}/back.gif`;

    const wildGifPath = newPokemon
      ? './src/data/sprites/poke-ball.png'
      : wildPokemon.volatiles.substitute
        ? './src/data/sprites/sub-default.png'
        : `./src/data/sprites/${wildPokemon.species.name.toLowerCase()}/${wildPokemon.set.shiny ? 'shiny' : 'default'}/default.gif`;

    const resolveImagePath = async (
      imagePath,
      fallback = missingSpritePath
    ) => {
      try {
        await fs.access(imagePath);
        return imagePath;
      } catch {
        return fallback;
      }
    };

    const trainerImageResolvedPath = await resolveImagePath(trainerGifPath);
    const wildImageResolvedPath = await resolveImagePath(wildGifPath);

    const trainerSpriteOriginal = await loadImage(trainerImageResolvedPath);
    const wildSpriteOriginal = await loadImage(wildImageResolvedPath);

    const width = 800;
    const height = 600;

    const TRAINER_SPRITE_SCALE = 2.0;
    const WILD_SPRITE_SCALE = 1.45;

    const scaledTrainerWidth =
      trainerSpriteOriginal.width * TRAINER_SPRITE_SCALE;
    const scaledTrainerHeight =
      trainerSpriteOriginal.height * TRAINER_SPRITE_SCALE;
    const scaledWildWidth = wildSpriteOriginal.width * WILD_SPRITE_SCALE;
    const scaledWildHeight = wildSpriteOriginal.height * WILD_SPRITE_SCALE;

    const trainerSpriteBottomLeftX = 150;
    const trainerSpriteBottomLeftY = height - 95;

    const wildSpriteBottomRightX = width - 170;
    const wildSpriteBottomRightY = height - 180;

    const trainerSpriteDrawX = trainerSpriteBottomLeftX;
    const trainerSpriteDrawY = trainerSpriteBottomLeftY - scaledTrainerHeight;

    const wildSpriteDrawX = wildSpriteBottomRightX - scaledWildWidth;
    const wildSpriteDrawY = wildSpriteBottomRightY - scaledWildHeight;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const overlayPath = path.join(tempDir, 'overlay.png');

    const drawOverlay = (
      trainerX,
      trainerY,
      trainerScaledWidth,
      trainerScaledHeight,
      wildX,
      wildY,
      wildScaledWidth,
      wildScaledHeight,
      currentActivePoolType
    ) => {
      ctx.clearRect(0, 0, width, height);
      drawHealthBar(
        ctx,
        trainerX,
        trainerY,
        trainerScaledWidth,
        trainerScaledHeight,
        trainerPokemon,
        currentActivePoolType
      );
      drawHealthBar(
        ctx,
        wildX,
        wildY,
        wildScaledWidth,
        wildScaledHeight,
        wildPokemon,
        currentActivePoolType
      );
    };

    drawOverlay(
      trainerSpriteDrawX,
      trainerSpriteDrawY,
      scaledTrainerWidth,
      scaledTrainerHeight,
      wildSpriteDrawX,
      wildSpriteDrawY,
      scaledWildWidth,
      scaledWildHeight,
      activePool.type
    );
    await fs.writeFile(overlayPath, canvas.toBuffer('image/png'));

    const finalGif = path.join(tempDir, 'final.gif');
    const defaultSpriteDuration = 2;

    const trainerDuration = await getGifDuration(
      trainerImageResolvedPath,
      defaultSpriteDuration
    );
    const wildDuration = await getGifDuration(
      wildImageResolvedPath,
      defaultSpriteDuration
    );

    const middleDuration = (trainerDuration + wildDuration) / 2;

    const trainerSpeedFactor = trainerDuration / middleDuration;
    const wildSpeedFactor = wildDuration / middleDuration;

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(backgroundPath)
        .input(trainerImageResolvedPath)
        .input(wildImageResolvedPath)
        .input(overlayPath)
        .complexFilter([
          `[0:v] scale=${width}:${height} [background_scaled]`,
          `[1:v] setpts=PTS/${trainerSpeedFactor}, scale=iw*${TRAINER_SPRITE_SCALE}:ih*${TRAINER_SPRITE_SCALE} [trainer]`,
          `[2:v] setpts=PTS/${wildSpeedFactor}, scale=iw*${WILD_SPRITE_SCALE}:ih*${WILD_SPRITE_SCALE} [wild]`,
          `[background_scaled][trainer] overlay=${trainerSpriteDrawX}:${trainerSpriteDrawY} [tmp1]`,
          `[tmp1][wild] overlay=${wildSpriteDrawX}:${wildSpriteDrawY} [tmp2]`,
          `[tmp2][3:v] overlay=0:0 [output_video]`,
          `[output_video] split [a][b]; [a] palettegen [p]; [b][p] paletteuse`,
        ])
        .outputOptions([
          '-y',
          '-loop',
          '0',
          `-t`,
          `${middleDuration}`,
          '-preset',
          'ultrafast',
        ])
        .output(finalGif)
        .on('end', resolve)
        .on('error', (err) =>
          reject(new Error(`FFmpeg GIF creation error: ${err.message}`))
        )
        .run();
    });

    const gifBuffer = await fs.readFile(finalGif);
    return gifBuffer;
  } catch (error) {
    console.error('Error during GIF generation:', error);
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
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
