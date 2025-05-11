import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };
import { convertSetToPokepaste } from '../../utils/pokemon.js';
import { setupBattle, runBattle } from '../../utils/battle.js';

const commandData = new SlashCommandBuilder()
  .setName('fight')
  .setDescription('Start a fight with a wild Pokemon');

const execute = async (interaction) => {
  var pokemonListe = await getPokemonFromPool(interaction.user.id);
  if (pokemonListe == null) {
    await interaction.reply(
      'Du hast das tägliche Limit an Kämpfen gegen wilde Pokemon erreicht (35). Warte bis Morgen um gegen neue Pokemon eines anderen Typs anzutreten'
    );
    return;
  }

  const randomIndex = Math.floor(Math.random() * pokemonListe.length);
  var randomPokemon = pokemonListe[randomIndex];
  console.log(randomPokemon);
  const pokemon = pokemonData[randomPokemon.toLowerCase()];
  if (!pokemon.sets || pokemon.sets.length === 0) {
    console.error(`Keine Sets für das Pokémon ${pokemon.name} verfügbar.`);
    return null;
  }
  const randomSetIndex = Math.floor(Math.random() * pokemon.sets.length);
  const randomSet = pokemon.sets[randomSetIndex];
  var randomSetPokepaste = convertSetToPokepaste(randomSet, pokemon.name);
  var query =
    'Select p.name, pokepaste from pokemon p inner join spieler s on p.Spieler = s.Name where discordid = ? and Lead = 1';
  connection.query(query, [interaction.user.id], async function (err, pokemon) {
    const battle = setupBattle(
      cleanPokepaste(pokemon[0].pokepaste),
      randomSetPokepaste
    );
    await interaction.reply('Ein wildes Pokemon taucht auf!');
    // runBattle braucht die user id und ruft dann irgendeine function von Jan auf
    // um dem user das log bild und neuen input zu geben

    var shiny = false;
    if (Math.floor(Math.random() * 8196) === 0) {
      console.log('SHINYYYYYY');
      shiny = true;
      randomSetPokepaste = randomSetPokepaste.replace(
        /(Ability: .*)\n/,
        '$1\nShiny: Yes\n'
      );
      console.log(randomSetPokepaste);
    }
    await runBattle(
      battle,
      interaction.user.id,
      interaction.user.username,
      randomSetPokepaste,
      shiny
    );
  });
};

export default {
  data: commandData,
  execute: execute,
};

async function getPokemonFromPool(discordid) {
  const pokemonListe = await new Promise((resolve, reject) => {
    const query =
      'SELECT pokemonliste, kämpfe FROM pool WHERE aktiv = 1 and spieler = (Select name from spieler where discordid = ?)';
    connection.query(query, [discordid], function (err, results) {
      if (err) return reject(err);
      if (results.length === 0) {
        resolve(null);
      } else if (results[0].kämpfe == 0) return resolve('ABBRECHEN');
      else {
        const liste = results[0].pokemonliste.split(',').map((p) => p.trim());
        resolve(liste);
      }
    });
  });

  if (pokemonListe === 'ABBRECHEN') {
    console.log('Keine Kämpfe mehr übrig – Funktion wird abgebrochen.');
    return null;
  }

  var query =
    'Update pool set kämpfe = kämpfe - 1 where aktiv = 1 and spieler = (Select name from spieler where discordid = ?)';
  connection.query(query, [discordid], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return;
    }
    console.log(results.affectedRows);
  });

  return pokemonListe;
}

function cleanPokepaste(paste) {
  const lines = paste.split('\n');
  if (lines.length === 0) return paste;

  const firstLine = lines[0].trim();

  // Pokémon-Name aus der letzten (nicht-einbuchstabigen) Klammer extrahieren
  const nameMatch = [...firstLine.matchAll(/\(([^()]{2,})\)/g)];
  let pokemonName = '';
  if (nameMatch.length > 0) {
    pokemonName = nameMatch[nameMatch.length - 1][1].trim();
  } else {
    // Wenn keine passende Klammer, entferne optionales Geschlecht (einzelne Buchstaben) in Klammern
    pokemonName = firstLine
      .replace(/\s*\([MF]\)/g, '')
      .split('@')[0]
      .trim();
  }

  // Item extrahieren (alles nach dem @, falls vorhanden)
  const itemMatch = firstLine.match(/@ (.+)$/);
  const item = itemMatch ? `@ ${itemMatch[1].trim()}` : '';

  // Neue erste Zeile
  lines[0] = `${pokemonName} ${item}`.trim();

  return lines.join('\n');
}
