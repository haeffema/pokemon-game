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
  await interaction.deferReply();
  const user = await getUserById(interaction.user.id);

  const newFight = await startNewBattle(user.discordId);
  if (!newFight) {
    await sendMessage(
      'Es ist bereits ein Kampf gestartet, beende deinen aktiven Kampf zuerst.',
      interaction
    );
    return;
  }
  await sendMessage('Ein neuer Kampf beginnt.', interaction);
  const battle = await runBattle(user.discordId, interaction);
  if (user.encounters >= maxEncounters) {
    if (battle.winner) {
      if (battle.set.shiny) {
        await sendMessage({
          title: 'Besonderes Ereignis!',
          description: `${user.name} hat gerade ein Shiny ${battle.set.species} gefangen!\nHerzlichen Glückwunsch!`,
          color: 'Green',
        });
        await makeUserPokemonShiny(user.discordId, battle.set.species);
      }
      await sendMessage(
        {
          title: 'Kampf gewonnen!',
          description: `Du hast den Kampf gewonnen, da das Limit erreicht ist kannst du maximal shiny Pokemon fangen.`,
          color: 'Green',
          noSprite: true,
        },
        interaction
      );
    } else {
      await sendMessage(
        {
          title: 'Kampf verloren!',
          description:
            'Du hast den Kampf verloren, da das Limit schon erreicht ist kannst du maximal shiny Pokemon fangen.',
          color: 'Red',
          noSprite: true,
        },
        interaction
      );
    }
    return;
  }
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
    }
    if (battle.set.shiny) {
      await sendMessage({
        title: 'Besonderes Ereignis!',
        description: `${user.name} hat gerade ein Shiny ${battle.set.species} gefangen!\nHerzlichen Glückwunsch!`,
        color: 'Green',
      });
    }
    const loot = await calculateLoot(
      battle.set.species,
      user.discordId,
      battle.set.item.endsWith('ite') && battle.set.item != 'Eviolite'
    );
    user.money += loot.money;
    if (loot.item) {
      await sendMessage(
        {
          title: 'Kampf gewonnen!',
          description: `Du hast den Kampf gewonnen und somit ${loot.money} PokeDollar verdient. Zudem hat das wilde Pokemon ein Item fallengelassen.`,
          color: 'Green',
          noSprite: true,
        },
        interaction
      );
      await sendMessage(
        {
          title: loot.item.name,
          description: loot.item.description,
          color: 'Green',
          sprite: loot.item.sprite,
        },
        interaction
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
        interaction
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
      interaction
    );
  }
  await updateUser(user);
}
