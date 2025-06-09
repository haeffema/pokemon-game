import showdown from 'pokemon-showdown';
import { SlashCommandBuilder } from 'discord.js';
import { startNewBattle, runBattle, calculateLoot } from '../utils/battle.js';
import { getUserById, updateUser } from '../database/user.js';
import { maxEncounters } from '../config.js';
import {
  addNewPokemonForUser,
  makeUserPokemonShiny,
} from '../database/pokemon.js';
import { addItemForUser } from '../database/item.js';
import { sendMessage } from '../utils/sendMessage.js';

export const data = new SlashCommandBuilder()
  .setName('fight')
  .setDescription('Starts a fight agains an random, wild pokemon.');

export async function execute(interaction) {
  const user = await getUserById(interaction.user.id);
  await interaction.deferReply();
  if (user.encounters >= maxEncounters) {
    await interaction.followUp(
      `Du hast das heutige fight limit von ${maxEncounters} schon erreicht.`
    );
    return;
  }
  const newFight = await startNewBattle(user.discordId);
  if (!newFight) {
    await interaction.followUp(
      'Es ist bereits ein Kampf gestartet, beende deinen aktiven Kampf zuerst.'
    );
    return;
  }
  await interaction.followUp('Ein neuer Kampf beginnt.');
  const battle = await runBattle(user.discordId);
  user.encounters += 1;
  if (battle.winner) {
    if (battle.new) {
      user.newEncounters += 1;
      battle.set.item = '';
      const pokemonData = {
        name: battle.set.species,
        pokepaste: showdown.Teams.exportSet(battle.set),
        lead: 0,
        shiny: battle.set.shiny ? 1 : 0,
      };
      await addNewPokemonForUser(user, pokemonData);
    } else {
      if (battle.set.shiny) {
        await makeUserPokemonShiny(user.discordId, battle.set.species);
      }
    }
    const loot = await calculateLoot(battle.set.species, user.discordId);
    user.money += loot.money;
    if (loot.item) {
      await sendMessage(
        {
          title: 'Kampf gewonnen!',
          description: `Du hast den Kampf gewonnen und somit ${loot.money} PokeDollar verdient. Zudem hat das wilde Pokemon ein Item fallengelassen.`,
          color: 'Green',
          noSprite: true,
        },
        user.discordId
      );
      await sendMessage(
        {
          title: loot.item.name,
          description: loot.item.description,
          color: 'Green',
          sprite: loot.item.sprite,
        },
        user.discordId
      );
      await addItemForUser(user, loot.item);
    } else {
      await sendMessage(
        {
          title: 'Kampf gewonnen!',
          description: `Du hast den Kampf gewonnen und somit ${loot.money} PokeDollar verdient.`,
          color: 'Green',
          noSprite: true,
        },
        user.discordId
      );
    }
  } else {
    await sendMessage(
      {
        title: 'Kampf verloren!',
        description:
          'Du hast den Kampf verloren, das wilde Pokemon ist geflohen.',
        color: 'Red',
        noSprite: true,
      },
      user.discordId
    );
  }
  await updateUser(user);
}
