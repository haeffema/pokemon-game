import { readdir } from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Path to your magick.exe on Windows
const MAGICK_PATH = `"D:/magick/magick.exe"`;

const baseDir = './src/data/sprites';

async function convertFirstGifFrameToPng(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await convertFirstGifFrameToPng(fullPath);
    } else if (
      entry.isFile() &&
      (entry.name === 'back.gif' || entry.name === 'default.gif')
    ) {
      const pngName = entry.name.replace('.gif', '.png');
      const outputPath = path.join(dir, pngName);

      try {
        // Convert only the first frame
        await execAsync(`${MAGICK_PATH} "${fullPath}[0]" "${outputPath}"`);
        console.log(`✅ Saved first frame: ${fullPath} → ${outputPath}`);
      } catch (error) {
        console.error(`❌ Failed to convert: ${fullPath}`, error.message);
      }
    }
  }
}

convertFirstGifFrameToPng(baseDir)
  .then(() =>
    console.log(
      '🎉 All back.gif and default.gif first frames converted to PNGs'
    )
  )
  .catch((err) => console.error('⚠️ Error during conversion:', err));
