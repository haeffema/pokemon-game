import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

import pokemonData from './data/pokemon.json' with { type: 'json' };

const skippedPokemon = [];
const noSpriteFileName = 'noSprite.json';
const outputDir = './src/data/sprites';

console.log('Starting Pokémon sprite processing...');

async function downloadImage(url, filepath) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    console.warn(`Invalid URL provided for download: ${url}. Skipping.`);
    return false;
  }

  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Failed to fetch ${url}: HTTP status ${response.status} - ${response.statusText}`
      );
      return false;
    }

    const fileStream = fs.createWriteStream(filepath);

    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', (err) => {
        console.error(`Stream error for ${url}: ${err.message}`);
        reject(err);
      });
      fileStream.on('finish', resolve);
    });

    console.log(`  Downloaded: ${filepath}`);
    return true;
  } catch (error) {
    console.error(`Error downloading ${url} to ${filepath}: ${error.message}`);
    return false;
  }
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created base output directory: ${outputDir}`);
}

for (const pokemonName of Object.keys(pokemonData)) {
  const pokemonDetails = pokemonData[pokemonName];
  pokemonDetails.back_sprite = pokemonDetails.sprite.replace(
    'pokemon/',
    'pokemon/back/'
  );
  pokemonDetails.shiny_sprite = pokemonDetails.sprite.replace(
    'pokemon/',
    'pokemon/shiny/'
  );
  pokemonDetails.back_shiny_sprite = pokemonDetails.sprite.replace(
    'pokemon/',
    'pokemon/back/shiny/'
  );
  const mainSpriteUrl = pokemonDetails.sprite;

  const match = mainSpriteUrl ? mainSpriteUrl.match(/\/(\d+)\.png$/) : null;

  if (match && match[1]) {
    const pokemonId = parseInt(match[1], 10);

    if (pokemonId > 1000) {
      console.log(
        `Skipping download for ${pokemonName} (ID: ${pokemonId} > 1000) from ${mainSpriteUrl}`
      );
      skippedPokemon.push(pokemonName);
    } else {
      console.log(`Processing sprites for: ${pokemonName} (ID: ${pokemonId})`);

      const pokemonOutputDir = path.join(outputDir, pokemonName);

      const spritesToDownload = [
        { url: pokemonDetails.sprite, filename: 'default.png' },
        { url: pokemonDetails.back_sprite, filename: 'back.png' },
        { url: pokemonDetails.shiny_sprite, filename: 'shiny.png' },
        { url: pokemonDetails.back_shiny_sprite, filename: 'back-shiny.png' },
      ];

      for (const spriteInfo of spritesToDownload) {
        if (spriteInfo.url) {
          const spritePath = path.join(pokemonOutputDir, spriteInfo.filename);
          await downloadImage(spriteInfo.url, spritePath);
        } else {
          console.warn(
            `  No URL found for ${spriteInfo.filename} for ${pokemonName}. Skipping.`
          );
        }
      }
    }
  } else {
    console.warn(
      `Could not extract ID or main sprite URL missing for ${pokemonName}. Skipping all sprites for this Pokémon.`
    );
    skippedPokemon.push(pokemonName);
  }
}

const skipsFilePath = path.join(outputDir, noSpriteFileName);
try {
  fs.writeFileSync(
    skipsFilePath,
    JSON.stringify(skippedPokemon, null, 2),
    'utf8'
  );
  console.log(`\nSkipped Pokémon names saved to: ${skipsFilePath}`);
  console.log(`Number of skipped Pokémon: ${skippedPokemon.length}`);
} catch (error) {
  console.error(
    `Error saving skipped Pokémon to ${skipsFilePath}:`,
    error.message
  );
}

console.log('\nFinished Pokémon sprite processing.');
