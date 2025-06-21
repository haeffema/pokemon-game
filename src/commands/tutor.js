import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import {
  checkIfUserHasPokemon,
  getAllUserPokemon,
} from '../database/pokemon.js';

import pokemonData from '../data/pokemon.json' with { type: 'json' };
import {
  addTutorMove,
  getAllLearnedMovesForPokemon,
  checkIfTutorMoveIsLearned,
} from '../database/tutor.js';
import { sendMessage } from '../utils/sendMessage.js';
import { awaitInteraction } from '../utils/componentManager.js';
import { getUserById, updateUser } from '../database/user.js';
import { getAllTutorMovesForPokemon } from '../utils/pokemonTeam.js';

export const data = new SlashCommandBuilder()
  .setName('tutor')
  .setDescription('Let your Pokemon learn a Move from the Tutor')
  .addStringOption((option) =>
    option
      .setName('pokemon')
      .setDescription('Your available Pokémon')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption((option) =>
    option
      .setName('move')
      .setDescription('Available Tutor Moves')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const userId = interaction.user.id;
  const chosenPokemon = interaction.options.getString('pokemon');
  const chosenMove = interaction.options.getString('move');

  const user = await getUserById(userId);

  if (user.money < 5000) {
    await sendMessage(
      'Du hast nicht genug Geld für einen Tutor Move.',
      interaction
    );
    return;
  }

  const pokemon = pokemonData[chosenPokemon.toLowerCase()];

  if (!(await checkIfUserHasPokemon(userId, chosenPokemon)) || !pokemon) {
    await sendMessage(
      'Das Pokemon existiert nicht oder du hast es noch nicht gefangen.',
      interaction
    );
    return;
  }

  const allTutorMoves = getAllTutorMovesForPokemon(pokemon.name);

  if (
    !allTutorMoves.includes(chosenMove) ||
    (await checkIfTutorMoveIsLearned(userId, chosenPokemon, chosenMove))
  ) {
    await sendMessage(
      'Der Move existiert nicht, ist kein Tutor Move oder du hast ihn bereits erlernt.',
      interaction
    );
    return;
  }

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('yes')
      .setLabel('Kaufen')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('no')
      .setLabel('nicht Kaufen')
      .setStyle(ButtonStyle.Danger)
  );

  const message = await sendMessage(
    {
      title: 'Tutor',
      description: `Der Tutor kann deinem ${chosenPokemon} den Move **${chosenMove}** beibringen.\n\nDer Preis hierfür beträgt 5.000 PokéDollar, aber dein ${chosenPokemon} kann sich dafür für den Rest seines Lebens daran erinnern.`,
      sprite:
        'https://play.pokemonshowdown.com/sprites/trainers/blackbelt-gen7.png',
    },
    interaction,
    [actionRow]
  );

  const response = await awaitInteraction(userId, message);

  if (response === 'no') {
    await sendMessage('Der Kaufvorgang wurde abgebrochen.', interaction);
  } else {
    await sendMessage('Glückwunsch, der Einkauf war erfolgreich.', interaction);
    user.money -= 5000;
    await updateUser(user);
    await addTutorMove(userId, chosenPokemon, chosenMove);
  }
}

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused(true);
  const discordId = interaction.user.id;

  switch (focusedValue.name) {
    case 'pokemon': {
      const userPokemon = await getAllUserPokemon(discordId);

      const filteredPokemon = userPokemon.filter((pokemon) =>
        pokemon.name.toLowerCase().startsWith(focusedValue.value.toLowerCase())
      );

      const options = filteredPokemon.slice(0, 25).map((pokemon) => ({
        name: pokemon.name,
        value: pokemon.name,
      }));
      await interaction.respond(options);
      break;
    }
    case 'move': {
      const chosenPokemon = interaction.options.getString('pokemon');

      const pokemon = pokemonData[chosenPokemon.toLowerCase()];

      if (pokemon === undefined) {
        await interaction.respond([]);
        break;
      }

      const allTutorMoves = getAllTutorMovesForPokemon(pokemon.name);

      const learnedMoves = await getAllLearnedMovesForPokemon(
        discordId,
        chosenPokemon
      );

      const mappedLearnedMoves = learnedMoves.map((move) => move.move);

      const availableMoves = allTutorMoves.filter(
        (move) => !mappedLearnedMoves.includes(move)
      );

      const filteredAvailableMoves = availableMoves.filter((move) =>
        move.toLowerCase().startsWith(focusedValue.value.toLowerCase())
      );

      const options = filteredAvailableMoves.slice(0, 25).map((move) => ({
        name: move,
        value: move,
      }));
      await interaction.respond(options);
      break;
    }
  }
}
