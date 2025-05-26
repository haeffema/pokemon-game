import { SlashCommandBuilder } from 'discord.js';
import {
  getAllUserPokemon,
  checkIfUserHasPokemon,
  setPokemonAsLead,
} from '../database/pokemon.js';

export const data = new SlashCommandBuilder()
  .setName('lead')
  .setDescription('Choose your lead Pokemon to fight against wild Pokemon')
  .addStringOption((option) =>
    option
      .setName('pokemon')
      .setDescription('Your available Pokémon')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction) {
  const discordId = interaction.user.id;
  const chosenPokemon = interaction.options.getString('pokemon');

  if (!(await checkIfUserHasPokemon(discordId, chosenPokemon))) {
    await interaction.reply({
      content: `❌ Ungültige Auswahl: Das Pokemon ${chosenPokemon} existiert nicht oder du hast es noch nicht gefangen.`,
    });
    return;
  }

  await setPokemonAsLead(discordId, chosenPokemon);
  await interaction.reply({
    content: `✅ Das Pokemon ${chosenPokemon} wurde als dein Lead-Pokemon festgelegt.`,
  });
}

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused();
  const discordId = interaction.user.id;

  const userPokemon = await getAllUserPokemon(discordId);

  const filteredPokemon = userPokemon.filter((pokemon) =>
    pokemon.name.toLowerCase().startsWith(focusedValue.toLowerCase())
  );

  const options = filteredPokemon.slice(0, 25).map((pokemon) => ({
    name: pokemon.name,
    value: pokemon.name,
  }));

  await interaction.respond(options);
}
