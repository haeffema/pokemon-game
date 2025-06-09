import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { addTmForUser, getAllTmsForUser } from '../database/tm.js';
import { getUserById, updateUser } from '../database/user.js';
import { sendMessage } from '../utils/sendMessage.js';
import { awaitInteraction } from '../utils/componentManager.js';
import tmData from '../data/tms.json' with { type: 'json' };
import itemData from '../data/items/shopItems.json' with { type: 'json' };
import { addItemForUser, getAllItemsForUser } from '../database/item.js';

export const data = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('Buy special Items and TMs for Battle')
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('Select whether you want to buy Items or TMs')
      .setRequired(true)
      .addChoices([
        {
          name: 'Items',
          value: 'items',
        },
        {
          name: 'TMs',
          value: 'tms',
        },
      ])
  )
  .addStringOption((option) =>
    option
      .setName('product')
      .setDescription('The item or TM you want to buy')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction) {
  const category = interaction.options.getString('category');
  const product = interaction.options.getString('product');
  const userId = interaction.user.id;

  const user = await getUserById(userId);

  await interaction.deferReply();

  switch (category) {
    case 'items': {
      const productData = itemData[product];
      const userItems = await getAllItemsForUser(userId);
      const userItemNames = userItems.map((item) => item.name.toLowerCase());
      if (!productData || userItemNames.includes(product.toLowerCase())) {
        await sendMessage(
          'Das Item existiert nicht oder du besitzt es schon.',
          interaction
        );
        return;
      }

      if (user.money < productData.price) {
        await sendMessage('Das Item kannst du dir nicht leisten.', interaction);
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
          title: `Item Shop`,
          description: `${productData.name}: ${productData.description}\nPrice: ${new Intl.NumberFormat('de-DE').format(productData.price)} PokeDollar.`,
          sprite: productData.sprite,
        },
        interaction,
        [actionRow]
      );
      const response = await awaitInteraction(userId, message);

      if (response === 'yes') {
        user.money -= productData.price;
        await updateUser(user);
        await addItemForUser(user, productData);
        await sendMessage('Einkauf erfolgreich.', interaction);
        return;
      }
      await sendMessage('Einkauf wurde abgebrochen ...', interaction);
      return;
    }
    case 'tms': {
      const userTMs = await getAllTmsForUser(userId);
      const userOwnsTM = userTMs.filter(
        (tm) => tm.tm.toLowerCase() === product.toLowerCase()
      );

      if (userOwnsTM.length > 0 || !tmData[product]) {
        await sendMessage(
          'Diese TM existiert nicht oder du besitzt sie bereits.',
          interaction
        );
        return;
      }

      if (user.money < 10000) {
        await sendMessage(
          'Du hast nicht genug geld um eine TM zu kaufen.',
          interaction
        );
        return;
      }

      const productData = tmData[product];

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
          title: `TM Shop`,
          description: `${product} is a ${productData.type} type move called ${productData.move}.\nPrice: 10.000 PokeDollar.`,
          sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-${productData.type.toLowerCase()}.png`,
        },
        interaction,
        [actionRow]
      );
      const response = await awaitInteraction(userId, message);

      if (response === 'yes') {
        user.money -= 10000;
        await updateUser(user);
        await addTmForUser(user.name, product);
        await sendMessage('Einkauf erfolgreich.', interaction);
        return;
      }
      await sendMessage('Einkauf wurde abgebrochen ...', interaction);
      return;
    }
  }
  await sendMessage('Keine valide Kategorie ausgewählt', interaction);
}

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused();
  const category = interaction.options.getString('category');
  const discordId = interaction.user.id;

  switch (category) {
    case 'items': {
      const userItems = await getAllItemsForUser(discordId);
      const userItemNames = userItems.map((item) => item.name.toLowerCase());

      const itemNames = Object.keys(itemData);
      const filteredItemNames = itemNames.filter(
        (item) =>
          !userItemNames.includes(item.toLowerCase()) &&
          item.toLowerCase().startsWith(focusedValue.toLowerCase())
      );

      const options = filteredItemNames.slice(0, 25).map((item) => ({
        name: item,
        value: item,
      }));
      await interaction.respond(options);
      return;
    }
    case 'tms': {
      const tmNumbers = Object.keys(tmData);
      const userTMs = await getAllTmsForUser(discordId);
      const mappedUserTMs = userTMs.map((tm) => tm.tm);

      const availableTMs = tmNumbers.filter(
        (tm) => !mappedUserTMs.includes(tm)
      );

      const filteredTMs = availableTMs.filter(
        (tm) =>
          tm.toLowerCase().includes(focusedValue.toLowerCase()) ||
          tmData[tm].move.toLowerCase().includes(focusedValue.toLowerCase())
      );

      const options = filteredTMs.slice(0, 25).map((tm) => ({
        name: `${tm} ${tmData[tm].move}`,
        value: tm,
      }));
      await interaction.respond(options);
      return;
    }
  }
  await interaction.respond([]);
}
