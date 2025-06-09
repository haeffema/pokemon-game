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
} from '../database/tutor.js';
import { sendMessage } from '../utils/sendMessage.js';
import { awaitInteraction } from '../utils/componentManager.js';
import { getUserById, updateUser } from '../database/user.js';

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
    await interaction.followUp(
      'Du hast nicht genug Geld für einen Tutor Move.'
    );
    return;
  }

  const pokemon = pokemonData[chosenPokemon.toLowerCase()];

  if (!(await checkIfUserHasPokemon(userId, chosenPokemon)) || !pokemon) {
    await interaction.followUp(
      'Das Pokemon existiert nicht oder du hast es noch nicht gefangen.'
    );
    return;
  }

  const alltutorMoves = Object.values(pokemon.moves).filter(
    (move) => move.type === 'tutor'
  );

  const allTutorMoveNames = alltutorMoves.map((move) => formatLabel(move.name));

  if (!allTutorMoveNames.includes(chosenMove)) {
    await interaction.followUp(
      'Der Move existiert nicht oder das Pokemon kann diesen bereits.'
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
    userId,
    [actionRow]
  );

  const response = await awaitInteraction(userId, message);

  if (response === 'no') {
    await interaction.followUp('Der Kaufvorgang wurde abgebrochen.');
  } else {
    await interaction.followUp('Glückwunsch, der Einkauf war erfolgreich.');
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

      const alltutorMoves = Object.values(pokemon.moves).filter(
        (move) => move.type === 'tutor'
      );

      const learnedMoves = await getAllLearnedMovesForPokemon(
        discordId,
        chosenPokemon
      );

      const learnedMoveNames = learnedMoves.map((move) => {
        return move.move.toLowerCase().replace(' ', '-');
      });

      const availableMoves = alltutorMoves.filter(
        (move) => !learnedMoveNames.includes(move.name)
      );

      const availableMovenames = availableMoves.map((move) =>
        formatLabel(move.name)
      );

      const filteredAvailableMoveNames = availableMovenames.filter((name) =>
        name.toLowerCase().startsWith(focusedValue.value.toLowerCase())
      );

      const options = filteredAvailableMoveNames.slice(0, 25).map((name) => ({
        name: name,
        value: name,
      }));
      await interaction.respond(options);
      break;
    }
  }
}

const formatLabel = (name) => {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
