import { SlashCommandBuilder } from 'discord.js';
import { getAllUsers, getUserById } from '../database/user.js';
import { addItemForUser, getAllItemsForUser } from '../database/item.js';
import { adminIds } from '../config.js';
import { sendMessage } from '../utils/sendMessage.js';
import questItems from '../data/items/questItems.json' with { type: 'json' };

export const data = new SlashCommandBuilder()
  .setName('quest-item')
  .setDescription('Sends an Quest Item to a User.')
  .addStringOption((option) =>
    option
      .setName('user')
      .setDescription('The user the gets the item')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption((option) =>
    option
      .setName('item')
      .setDescription('The quest item')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const userId = interaction.user.id;
  const chosenUser = interaction.options.getString('user');
  const chosenItem = interaction.options.getString('item');

  if (!adminIds.includes(userId)) {
    await sendMessage('Dieser Befehl ist nur für Admins.', interaction);
    return;
  }

  const user = await getUserById(chosenUser);

  if (!user) {
    await sendMessage('Der user existiert nicht.', interaction);
    return;
  }

  const userItems = await getAllItemsForUser(chosenUser);
  const mappedUserItems = userItems.map((item) => {
    return item.name;
  });

  const item = questItems[chosenItem];

  if (mappedUserItems.includes(chosenItem) || !item) {
    await sendMessage(
      'Das Item existiert nicht oder der user hat dieses bereits.',
      interaction
    );
    return;
  }

  await sendMessage('Item verschickt.', interaction);
  await addItemForUser(user, item);
  await sendMessage(
    {
      title: 'Besonderes Item erhalten.',
      description: `${item.name} erhalten:\n\n${item.description}`,
      sprite: item.sprite,
      color: 'Green',
    },
    chosenUser
  );
}

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused(true);
  const discordId = interaction.user.id;

  if (!adminIds.includes(discordId)) {
    await interaction.respond([]);
    return;
  }

  switch (focusedValue.name) {
    case 'user': {
      const users = await getAllUsers();

      const options = users.slice(0, 25).map((user) => ({
        name: user.name,
        value: user.discordId,
      }));
      await interaction.respond(options);
      return;
    }
    case 'item': {
      const chosenUser = interaction.options.getString('user');

      const userItems = await getAllItemsForUser(chosenUser);
      const mappedUserItems = userItems.map((item) => {
        return item.name;
      });

      const availableItemNames = Object.keys(questItems).filter(
        (item) =>
          !mappedUserItems.includes(item) &&
          item.toLowerCase().startsWith(focusedValue.value.toLowerCase())
      );

      const options = availableItemNames.slice(0, 25).map((item) => ({
        name: item,
        value: item,
      }));

      await interaction.respond(options);
      return;
    }
  }
  await interaction.respond([]);
}
