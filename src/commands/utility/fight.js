import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };
import { convertSetToPokepaste } from '../../utils/pokemon.js';
import { setupBattle, runBattle } from '../../utils/battle.js';

const commandData = new SlashCommandBuilder()
  .setName('fight')
  .setDescription('Start a fight with a wild Pokemon');

const execute = async (interaction) => {
  var pokemonListe = await getPokemonFromPool(
    'Grass',
    [
      'Uber',
      'OU',
      'OUBL',
      'UUBL',
      'UU',
    ],
    10
  );
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
  const randomSetPokepaste = convertSetToPokepaste(randomSet, pokemon.name);
  var query =
    'Select p.name, pokepaste from pokemon p inner join spieler s on p.Spieler = s.Name where discordid = ? and Lead = 1';
  connection.query(query, [interaction.user.id], async function (err, pokemon) {
    console.log(pokemon[0].name);
    console.log(pokemon[0].pokepaste);
    //TODO: pokepaste in setupBattle

  const battle = setupBattle(pokemon[0].pokepaste, randomSetPokepaste);
  await interaction.reply('Fight started!');
  // runBattle braucht die user id und ruft dann irgendeine function von Jan auf
  // um dem user das log bild und neuen input zu geben
  await runBattle(battle, interaction.user.id);
});
};

export default {
  data: commandData,
  execute: execute,
};

async function getPokemonFromPool(type, forbiddenTiers, number) {
  //Übergabevariablen nur für Generierung neuer Pool notwendig
  // Datum von heute im Format YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  const pokemonListe = await new Promise((resolve, reject) => {
    const query = 'SELECT pokemonliste FROM pool WHERE DATE(datum) = ?';
    connection.query(query, [today], function (err, results) {
      if (err) return reject(err);

      if (results.length === 0) {
        // Falls kein Eintrag für heute existiert
        resolve(null);
      } else {
        // Wir nehmen nur das erste Ergebnis (falls mehrere)
        const liste = results[0].pokemonliste.split(',').map((p) => p.trim());
        resolve(liste);
      }
    });
  });

  if (!pokemonListe) {
    console.log('Kein Pool gefunden, generiere neuen...');
    await filterPokemonByType(type, forbiddenTiers, number);
    return 'Pool generiert';
  }

  return pokemonListe;
}

async function filterPokemonByType(type, forbiddenTiers, number) {
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

    var query = 'Insert into pool (typ, pokemonliste, anzahl) VALUES(?,?,?)';
    connection.query(query, [type, pokemonListeStr, anzahl]);
    // Rückgabe der gewünschten Anzahl von Pokémon
    return selected;
  } catch (err) {
    console.error('Fehler beim Laden oder Verarbeiten der Datei:', err.message);
    return [];
  }
}