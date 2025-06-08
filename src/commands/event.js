/**import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };
import { convertSetToPokepaste } from '../../utils/pokemon.js';
import { setupBattle, runBattle } from '../../utils/battle.js';

const commandData = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Start an Event Fight');

const execute = async (interaction) => {
  var randomPokemon = 'Glalie';

  const pokemon = pokemonData[randomPokemon.toLowerCase()];
  if (!pokemon.sets || pokemon.sets.length === 0) {
    console.error(`Keine Sets für das Pokémon ${pokemon.name} verfügbar.`);
    return null;
  }

  const randomSetIndex = Math.floor(Math.random() * pokemon.sets.length);
  const randomSet = pokemon.sets[randomSetIndex];

  // Überprüfen, ob das Set ein Item-Attribut enthält und ob das Item den Ausdruck "ite" enthält
  if (randomSet.item && randomSet.item.includes('ite')) {
    console.log(
      `Gefundenes Item im Set für ${pokemon.name}: ${randomSet.item}`
    );
  } else {
    console.log(`Kein passendes Item im Set für ${pokemon.name} gefunden.`);
  }
  await interaction.reply(
    'Der Event Befehl befindet sich derzeit in Arbeit. Wenn du Vorschläge für coole Events hast dann wende dich an Jan.'
  );
};

export default {
  data: commandData,
  execute: execute,
};
*/
