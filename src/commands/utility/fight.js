import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };
import { convertSetToPokepaste } from '../../utils/pokemon.js';
import { setupBattle, runBattle } from '../../utils/battle.js';

const commandData = new SlashCommandBuilder()
  .setName('fight')
  .setDescription('Start a fight with a wild Pokemon');

const execute = async (interaction) => {
  var pokemonListe = await getPokemonFromPool(12, interaction.user.id);
  if (pokemonListe == null) {
    await interaction.reply(
      'Du hast das tägliche Limit an Kämpfen gegen wilde Pokemon erreicht (30). Warte bis Morgen um gegen neue Pokemon eines anderen Typs anzutreten'
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
    await runBattle(battle, interaction.user.id, randomSetPokepaste, shiny);
  });
};

export default {
  data: commandData,
  execute: execute,
};

async function getPokemonFromPool(number, discordid) {
  //Übergabevariablen nur für Generierung neuer Pool notwendig

  const today = new Date().toISOString().slice(0, 10);

  const pokemonListe = await new Promise((resolve, reject) => {
    const query =
      'SELECT pokemonliste, kämpfe FROM pool WHERE DATE(datum) = ? and spieler = (Select name from spieler where discordid = ?)';
    connection.query(query, [today, discordid], function (err, results) {
      if (err) return reject(err);
      if (results.length === 0) {
        // Falls kein Eintrag für heute existiert
        resolve(null);
      } else if (results[0].kämpfe == 0) return resolve('ABBRECHEN');
      else {
        // Wir nehmen nur das erste Ergebnis (falls mehrere)
        const liste = results[0].pokemonliste.split(',').map((p) => p.trim());
        resolve(liste);
      }
    });
  });

  if (pokemonListe === 'ABBRECHEN') {
    console.log('Keine Kämpfe mehr übrig – Funktion wird abgebrochen.');
    return null;
  }

  if (!pokemonListe) {
    console.log('Kein Pool gefunden, generiere neuen...');
    const spieler = await new Promise((resolve, reject) => {
      const query = 'SELECT * FROM spieler WHERE discordid = ?';
      connection.query(query, [discordid], function (err, results) {
        if (err) return reject(err);
        else {
          resolve(results[0]);
        }
      });
    });
    var forbiddenTiers;
    if (spieler.orden == 0 || spieler.orden == 1) {
      forbiddenTiers = ['Uber', 'OU', 'OUBL', 'UUBL', 'UU'];
    } else if (spieler.orden == 2 || spieler.orden == 3) {
      forbiddenTiers = ['Uber', 'OU', 'OUBL'];
    } else {
      forbiddenTiers = ['Uber'];
    }
    const poolTag = await new Promise((resolve, reject) => {
      const query = 'SELECT * FROM poolTag WHERE aktiv = 1';
      connection.query(query, function (err, results) {
        if (err) return reject(err);
        else {
          resolve(results[0]);
        }
      });
    });

    var generiertePokemonListe = await filterPokemonByType(
      poolTag.typ,
      forbiddenTiers,
      number,
      discordid
    );
    return generiertePokemonListe.split(', ');
  }
  var query =
    'Update pool set kämpfe = kämpfe - 1 where DATE(datum) = ? and spieler = (Select name from spieler where discordid = ?)';
  connection.query(query, [today, discordid], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return;
    }
    console.log(results.affectedRows);
  });

  return pokemonListe;
}

async function filterPokemonByType(type, forbiddenTiers, number, discordid) {
  try {
    const allPokemon = Object.values(pokemonData);
    // Filtern mit optionalem Typ
    const filtered = allPokemon.filter(
      (p) =>
        (!type || p.types.includes(type)) && !forbiddenTiers.includes(p.tier)
    );

    // Mischen des Arrays mit dem Fisher-Yates-Algorithmus
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    const selected = filtered.slice(0, number);

    // Kommagetrennte Liste erstellen
    const pokemonListeStr = selected.map((p) => p.name).join(', ');
    const anzahl = selected.length;

    var query =
      'Insert into pool (typ, pokemonliste, anzahl, spieler, kämpfe) VALUES(?,?,?,(Select name from spieler where discordid = ?),?)';
    connection.query(query, [type, pokemonListeStr, anzahl, discordid, 29]);
    // Rückgabe der gewünschten Anzahl von Pokémon
    return pokemonListeStr;
  } catch (err) {
    console.error('Fehler beim Laden oder Verarbeiten der Datei:', err.message);
    return [];
  }
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
