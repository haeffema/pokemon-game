import { createCanvas, loadImage } from 'canvas';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Für ES Module __dirname definieren
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pfad zum Bildordner
const ordenDir = path.join(__dirname, '../data/orden');

// Exportierte Funktion
export async function createOrdenImage(anzahlOrden, name) {
  const widthPerOrden = 40;
  const height = 40;
  const total = 8;

  const canvas = createCanvas(widthPerOrden * total, height);
  const ctx = canvas.getContext('2d');

  // Lade alle Ordenbilder (z. B. orden1.png bis orden8.png)
  const ordenBilder = await Promise.all(
    Array.from({ length: total }, async (_, i) => {
      const filePath = path.join(ordenDir, `orden${i + 1}.png`);
      return await loadImage(filePath);
    })
  );

  // Leeres Orden-Bild
  const leerImg = await loadImage(path.join(ordenDir, 'leer.png'));

  // Zeichne alle Bilder
  for (let i = 0; i < total; i++) {
    const img = i < anzahlOrden ? ordenBilder[i] : leerImg;
    ctx.drawImage(img, i * widthPerOrden, 0, widthPerOrden, height);
  }

  const outputPath = path.join(__dirname, `../data/orden/${name}.png`);
  await writeFile(outputPath, canvas.toBuffer('image/png'));

  console.log(`Bild gespeichert unter: ${outputPath}`);
}
