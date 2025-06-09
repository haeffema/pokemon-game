import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllItemsForUser } from '../database/item.js';
import { getAllTmsForUser } from '../database/tm.js';
import tmData from '../data/tms.json' with { type: 'json' };
import { getUserById } from '../database/user.js';

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
  const category = interaction.options.getString('category');
  const selected = interaction.options.getString('item-tm');
  const userId = interaction.user.id;

  const user = await getUserById(userId);

  switch (category) {
    case 'items': {
      const userItems = await getAllItemsForUser(userId);
      if (selected === 'all') {
        await interaction.reply('List wird erstellt ...');
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
          const itemEmbed = new EmbedBuilder()
            .setTitle('Alle Items')
            .setDescription(description)
            .setThumbnail(user.sprite)
            .setColor('Blue');
          await interaction.followUp({ embeds: [itemEmbed] });
        }

        return;
      }
      const item = userItems.filter(
        (item) => item.name.toLowerCase() === selected.toLowerCase()
      );

      if (item.length !== 1) {
        await interaction.reply({
          content: `Ungültige Auswahl: Das Item ${selected} existiert nicht oder du besitzt es noch nicht.`,
        });
        return;
      }

      const itemEmbed = new EmbedBuilder()
        .setTitle(item[0].name)
        .setDescription(item[0].description)
        .setThumbnail(item[0].sprite)
        .setColor('Blue');
      await interaction.reply({ embeds: [itemEmbed] });

      break;
    }
    case 'tms': {
      const userTMs = await getAllTmsForUser(userId);
      if (selected === 'all') {
        await interaction.reply('List wird erstellt ...');
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
          const itemEmbed = new EmbedBuilder()
            .setTitle("Alle TM's")
            .setDescription(description)
            .setThumbnail(user.sprite)
            .setColor('Blue');
          await interaction.followUp({ embeds: [itemEmbed] });
        }

        return;
      }
      const tm = userTMs.filter(
        (tm) => tm.tm.toLowerCase() === selected.toLowerCase()
      );

      if (tm.length !== 1) {
        await interaction.reply({
          content: `Ungültige Auswahl: Die TM ${selected} existiert nicht oder du besitzt sie noch nicht.`,
        });
        return;
      }
      const selectedTMData = tmData[tm[0].tm];
      const itemEmbed = new EmbedBuilder()
        .setTitle(tm[0].tm)
        .setDescription(`${selectedTMData.move}: ${selectedTMData.type}`)
        .setThumbnail(
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-${selectedTMData.type.toLowerCase()}.png`
        )
        .setColor('Blue');
      await interaction.reply({ embeds: [itemEmbed] });

      break;
    }
    default:
      await interaction.reply('Kategorie existiert nicht.');
  }

  return;
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
