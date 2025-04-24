import { createCanvas, loadImage } from 'canvas';
import { createWriteStream } from 'fs';

const width = 800;
const height = 600;

function drawHealthBar(ctx, x, y, width, height, hp, maxHp, name, status) {
  const percentage = hp / maxHp;
  const percentText = `${Math.round(percentage * 100)}%`;

  // Name oben zentriert
  ctx.fillStyle = 'black';
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
    ctx.fillText(statusUpper, x + statusBoxWidth / 2, y + height + statusBoxHeight / 2);
  }
}

export async function generateBattleImage(leftPokemon, rightPokemon, outputPath = 'pokemon_battle.png') {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const backgroundURL = 'https://preview.redd.it/d9spuwer2c491.png?width=1050&format=png&auto=webp&s=9ca8c75c63da9f8bb134e955d73e2770d073375e';

  // Bilder laden
  const [background, leftSprite, rightSprite] = await Promise.all([
    loadImage(backgroundURL),
    loadImage(leftPokemon.spriteUrl),
    loadImage(rightPokemon.spriteUrl),
  ]);

  // Hintergrund
  ctx.drawImage(background, 0, 0, width, height);

  // Linkes Pokémon (z. B. Pikachu)
  const leftSize = 220;
  const leftX = 80;
  const leftY = height - leftSize - 40;
  ctx.drawImage(leftSprite, leftX, leftY, leftSize, leftSize);
  drawHealthBar(ctx, leftX + 20, leftY - 35, 180, 25, leftPokemon.hp, leftPokemon.maxHp, leftPokemon.name, leftPokemon.status);

  // Rechtes Pokémon (z. B. Bulbasaur)
  const rightSize = 150;
  const rightX = width - rightSize - 200;
  const rightY = 180;
  ctx.drawImage(rightSprite, rightX, rightY, rightSize, rightSize);
  drawHealthBar(ctx, rightX - 20, rightY - 35, 180, 25, rightPokemon.hp, rightPokemon.maxHp, rightPokemon.name, rightPokemon.status);

  // Speichern
  const out = createWriteStream(outputPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => {
    console.log(`✅ Bild gespeichert unter: ${outputPath}`);
  });
}
