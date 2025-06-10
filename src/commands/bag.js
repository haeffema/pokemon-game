import { SlashCommandBuilder } from 'discord.js';
import { getAllItemsForUser } from '../database/item.js';
import { getAllTmsForUser } from '../database/tm.js';
import tmData from '../data/tms.json' with { type: 'json' };
import { getUserById } from '../database/user.js';
import { sendMessage } from '../utils/sendMessage.js';

export const data = new SlashCommandBuilder()
  .setName('bag')
  .setDescription('Look at the Items and TMs in your Bag')
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('The category to get information about.')
      .setRequired(true)
      .addChoices(
        { name: 'Items', value: 'items' },
        { name: 'TMs', value: 'tms' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('item-tm')
      .setDescription('Your available Items / TMs')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();
  const category = interaction.options.getString('category');
  const selected = interaction.options.getString('item-tm');
  const userId = interaction.user.id;

  const user = await getUserById(userId);

  switch (category) {
    case 'items': {
      const userItems = await getAllItemsForUser(userId);
      if (selected === 'all') {
        await sendMessage('List wird erstellt ...', interaction);
        const descriptions = [''];

        for (const item of userItems) {
          if (
            (
              descriptions[descriptions.length - 1] +
              `**${item.name}**: ${item.description}\n\n`
            ).length > 4096
          ) {
            descriptions.push('');
          }
          descriptions[descriptions.length - 1] +=
            `**${item.name}**: ${item.description}\n\n`;
        }

        for (const description of descriptions) {
          await sendMessage(
            {
              title: 'Alle Items',
              description: description,
              sprite: user.sprite,
            },
            interaction
          );
        }

        return;
      }
      const item = userItems.filter(
        (item) => item.name.toLowerCase() === selected.toLowerCase()
      );

      if (item.length !== 1) {
        await sendMessage(
          `Ungültige Auswahl: Das Item ${selected} existiert nicht oder du besitzt es noch nicht.`,
          interaction
        );
        return;
      }

      await sendMessage(
        {
          title: item[0].name,
          description: item[0].description,
          sprite: item[0].sprite,
        },
        interaction
      );
      return;
    }
    case 'tms': {
      const userTMs = await getAllTmsForUser(userId);
      if (selected === 'all') {
        await sendMessage('List wird erstellt ...', interaction);
        const descriptions = [''];

        for (const tm of userTMs) {
          if (
            (
              descriptions[descriptions.length - 1] +
              `**${tm.tm}**: ${tmData[tm.tm].move}\n\n`
            ).length > 4096
          ) {
            descriptions.push('');
          }
          descriptions[descriptions.length - 1] +=
            `**${tm.tm}**: ${tmData[tm.tm].move}\n\n`;
        }

        for (const description of descriptions) {
          await sendMessage(
            {
              title: "All TM's",
              description: description,
              sprite: user.sprite,
            },
            interaction
          );
        }
        return;
      }
      const tm = userTMs.filter(
        (tm) => tm.tm.toLowerCase() === selected.toLowerCase()
      );

      if (tm.length !== 1) {
        await sendMessage(
          `Ungültige Auswahl: Die TM ${selected} existiert nicht oder du besitzt sie noch nicht.`,
          interaction
        );
        return;
      }
      const selectedTMData = tmData[tm[0].tm];
      await sendMessage(
        {
          title: tm[0].tm,
          description: `${selectedTMData.move}: ${selectedTMData.type}`,
          sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-${selectedTMData.type.toLowerCase()}.png`,
        },
        interaction
      );
      return;
    }
  }
  await sendMessage('Kategorie existiert nicht.', interaction);
}

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused();
  const discordId = interaction.user.id;
  const category = interaction.options.getString('category');

  let options = [];

  switch (category) {
    case 'items': {
      const userItems = await getAllItemsForUser(discordId);
      const filteredItems = userItems.filter((item) =>
        item.name.toLowerCase().startsWith(focusedValue.toLowerCase())
      );
      options = filteredItems.slice(0, 24).map((item) => ({
        name: item.name,
        value: item.name,
      }));
      break;
    }
    case 'tms': {
      const userTMs = await getAllTmsForUser(discordId);
      const filteredTMs = userTMs.filter((tm) => {
        return (
          tm.tm.toLowerCase().includes(focusedValue.toLowerCase()) ||
          tmData[tm.tm].move.toLowerCase().includes(focusedValue.toLowerCase())
        );
      });
      options = filteredTMs.slice(0, 24).map((tm) => ({
        name: `${tm.tm} ${tmData[tm.tm].move}`,
        value: tm.tm,
      }));
      break;
    }
  }
  options.unshift({
    name: 'Show All',
    value: 'all',
  });
  await interaction.respond(options);
}
