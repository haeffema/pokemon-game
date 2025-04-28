import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };

const commandData = new SlashCommandBuilder()
    .setName('fight')
    .setDescription('Starts a fight with a wild Pokemon');

const execute = async (interaction) => {
    var pokemonListe = await getPokemonFromPool("Fire", ['Uber', 'OUBL', 'UUBL', 'UU', 'RUBL', 'RU', 'NUBL', 'NU', 'ZUBL', 'ZU', 'PUBL', 'PU'], 10)
    const randomIndex = Math.floor(Math.random() * pokemonListe.length);
    var randomPokemon = pokemonListe[randomIndex];
    console.log(randomPokemon)
    const pokemon = pokemonData[randomPokemon.toLowerCase()];
    if (!pokemon.sets || pokemon.sets.length === 0) {
        console.error(`Keine Sets für das Pokémon ${pokemonName} verfügbar.`);
        return null;
      }
      const randomSetIndex = Math.floor(Math.random() * pokemon.sets.length);
      const randomSet = pokemon.sets[randomSetIndex];
      console.log(randomSet)
      var query= "Select p.name, pokepaste from pokemon p inner join spieler s on p.Spieler = s.Name where discordid = ? and Lead = 1"
      connection.query(query, [interaction.user.id], async function (err, pokemon) {
        console.log(pokemon[0].name)
        console.log(pokemon[0].pokepaste)
        //TODO: Pokemon Daten an Max Funktion übergeben
    })
    await interaction.reply('Fight started!');
};

export default {
    data: commandData,
    execute: execute
};


async function getPokemonFromPool(type, forbiddenTiers, number) { //Übergabevariablen nur für Generierung neuer Pool notwendig
  // Datum von heute im Format YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  const pokemonListe = await new Promise((resolve, reject) => {
    const query = "SELECT pokemonliste FROM pool WHERE DATE(datum) = ?";
    connection.query(query, [today], function (err, results) {
      if (err) return reject(err);

      if (results.length === 0) {
        // Falls kein Eintrag für heute existiert
        resolve(null);
      } else {
        // Wir nehmen nur das erste Ergebnis (falls mehrere)
        const liste = results[0].pokemonliste.split(',').map(p => p.trim());
        resolve(liste);
      }
    });
  });

  if (!pokemonListe) {
    console.log("Kein Pool gefunden, generiere neuen...");
    await filterPokemonByType(type,
  forbiddenTiers,
  number); 
  return "Pool generiert"
  }

  return pokemonListe;
}