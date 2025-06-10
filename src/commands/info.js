import { SlashCommandBuilder } from 'discord.js';
import { getUserById } from '../database/user.js';
import { getAllUserPokemon } from '../database/pokemon.js';
import { maxEncounters } from '../config.js';
import { getAllItemsForUser } from '../database/item.js';
import { generateBadgeImage } from '../utils/imageGenerator.js';
import { generatePokepasteForTrainer } from '../utils/pokepaste.js';
import { sendMessage } from '../utils/sendMessage.js';
import pokemonData from '../data/pokemon.json' with { type: 'json' };
import dropItems from '../data/items/dropItems.json' with { type: 'json' };
import questItems from '../data/items/questItems.json' with { type: 'json' };
import shopItems from '../data/items/shopItems.json' with { type: 'json' };

export const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription(
    'Get information about your Pokedex or an Overview over your Progress'
  )
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('The category to get information about.')
      .setRequired(true)
      .addChoices(
        { name: 'Overview', value: 'overview' },
        { name: 'Pokedex', value: 'pokedex' }
      )
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const category = interaction.options.getString('category');
  const userId = interaction.user.id;

  const user = await getUserById(userId);

  const userPokemon = await getAllUserPokemon(userId);

  switch (category) {
    case 'overview': {
      const userItems = await getAllItemsForUser(userId);
      const allItems = [
        ...Object.keys(dropItems),
        ...Object.keys(questItems),
        ...Object.keys(shopItems),
      ];
      const ordenImageBuffer = await generateBadgeImage(user.badges);
      await sendMessage(
        {
          title: `Überblick für ${user.name}`,
          sprite: user.sprite,
          fields: [
            {
              name: 'Geld',
              value: `${new Intl.NumberFormat('de-DE').format(user.money)} PokeDollar`,
              inline: true,
            },
            {
              name: 'Kämpfe',
              value: `${user.encounters}/${maxEncounters}`,
              inline: true,
            },
            { name: ' ', value: ' ', inline: false },
            {
              name: 'Pokemon',
              value: `${userPokemon.length}/${Object.keys(pokemonData).length}`,
              inline: true,
            },
            {
              name: 'Items',
              value: `${userItems.length}/${Object.keys(allItems).length}`,
              inline: true,
            },
          ],
          image: ordenImageBuffer,
        },
        interaction
      );
      return;
    }
    case 'pokedex': {
      const pokedexInfo = await generatePokepasteForTrainer(userId);
      await sendMessage(`Your Pokedex: ${pokedexInfo}`, interaction);
      return;
    }
  }

  await sendMessage('Keine Kategorie ausgewählt.', interaction);
}
