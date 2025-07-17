import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const BASE_URL = 'https://play.pokemonshowdown.com/sprites/';
const OUTPUT_BASE_DIR = './src/data/sprites/';

const POKEMON_IDS = ['ditto'];

async function downloadSprite(
  pokemonId,
  spriteSourceType,
  outputSubDir,
  outputFileName
) {
  const url = `${BASE_URL}${spriteSourceType}/${pokemonId}.gif`;
  const outputPath = path.join(
    OUTPUT_BASE_DIR,
    pokemonId,
    outputSubDir,
    outputFileName
  );
  const outputDir = path.dirname(outputPath);

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(
          `[WARN] Sprite not found for ${pokemonId} (${spriteSourceType}): ${url}`
        );
        return false;
      }
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    fs.writeFileSync(outputPath, buffer);
    console.log(`Downloaded: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(
      `[ERROR] Failed to download ${url} to ${outputPath}:`,
      error.message
    );
    return false;
  }
}

async function main() {
  console.log('Starting sprite download for Pokémon...');

  for (const pokemonId of POKEMON_IDS) {
    console.log(`--- Processing ${pokemonId} ---`);

    await downloadSprite(pokemonId, 'ani', 'default', 'default.gif');
    await new Promise((resolve) => setTimeout(resolve, 50));
    await downloadSprite(pokemonId, 'ani-back', 'default', 'back.gif');
    await new Promise((resolve) => setTimeout(resolve, 50));

    await downloadSprite(pokemonId, 'ani-shiny', 'shiny', 'default.gif');
    await new Promise((resolve) => setTimeout(resolve, 50));
    await downloadSprite(pokemonId, 'ani-back-shiny', 'shiny', 'back.gif');
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`Finished ${pokemonId}\n`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('All sprite downloads attempted.');
}

main();
