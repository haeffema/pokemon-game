import { readdir, unlink, stat } from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MAGICK_PATH = `"convert"`;

const baseDir = './src/data/sprites';

async function deleteFileIfExists(filePath) {
  try {
    await stat(filePath);
    await unlink(filePath);
    console.log(`Deleted existing file: ${filePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Failed to delete file ${filePath}:`, error.message);
    }
  }
}

async function convertGifFramesToPngs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await convertGifFramesToPngs(fullPath);
    } else if (
      entry.isFile() &&
      (entry.name === 'back.gif' || entry.name === 'default.gif')
    ) {
      const pngBaseName = entry.name.replace('.gif', '');
      const outputPathPattern = path.join(dir, `${pngBaseName}-%d.png`);
      const oldPngPath = path.join(dir, `${pngBaseName}.png`);

      const expectedFirstFrame = path.join(dir, `${pngBaseName}-0.png`);
      let alreadyConverted = false;
      try {
        await stat(expectedFirstFrame);
        alreadyConverted = true;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(
            `Error checking for existing PNG frames in ${dir}:`,
            error.message
          );
        }
      }

      if (alreadyConverted) {
        console.log(
          `Skipping ${entry.name} in ${dir}: PNG frames already exist.`
        );
        continue;
      }

      await deleteFileIfExists(oldPngPath);

      try {
        await execAsync(`${MAGICK_PATH} "${fullPath}" "${outputPathPattern}"`);
        console.log(`Converted all frames: ${fullPath} → ${outputPathPattern}`);
      } catch (error) {
        console.error(`Failed to convert: ${fullPath}`, error.message);
      }
    }
  }
}

convertGifFramesToPngs(baseDir)
  .then(() =>
    console.log(
      'All back.gif and default.gif frames converted to PNGs (if not already converted), and old single PNGs deleted.'
    )
  )
  .catch((err) => console.error('Error during conversion:', err));
