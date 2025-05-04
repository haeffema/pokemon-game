import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import fs from 'fs/promises';
import itemData from '../../data/buyable_items.json' with { type: 'json' };
import connection from '../../utils/databaseConnection.js';

const commandData = new SlashCommandBuilder()
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
  );

export async function execute(interaction) {
  const category = interaction.options.getString('category');
  const userId = interaction.user.id;

  if (category === 'items') {
    const itemArray = Object.values(itemData);

    const shopEmbed = new EmbedBuilder()
      .setTitle('🛒 Battle Shop')
      .setDescription(
        'Select an item below to view more information or purchase it.'
      )
      .setColor('Blue')
      .setFooter({ text: 'Category: Items' });

    const ownedItems = await new Promise((resolve, reject) => {
      const query =
        'SELECT name FROM item WHERE spieler = (Select name from spieler where discordid = ?)';
      connection.query(query, [userId], function (err, results) {
        if (err) return reject(err);

        const owned = results.map((row) => row.name);
        resolve(owned);
      });
    });

    const buyableItems = itemArray.filter(
      (item) => !ownedItems.includes(item.name)
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('shop_item_select')
      .setPlaceholder('Choose an item')
      .addOptions(
        buyableItems.map((item) => ({
          label: item.name,
          value: item.name,
          description: item.description.slice(0, 50),
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      embeds: [shopEmbed],
      components: [row],
    });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
      filter: (i) => i.user.id === userId,
    });

    collector.on('collect', async (selectInteraction) => {
      const selectedItemName = selectInteraction.values[0];
      const selectedItem = itemData[selectedItemName];

      if (!selectedItem) {
        return await selectInteraction.reply({
          content: '❌ Item not found.',
        });
      }

      const itemEmbed = new EmbedBuilder()
        .setTitle(`🧾 ${selectedItem.name}`)
        .setDescription(
          `${selectedItem.description}\n\n💰 Price: ${selectedItem.price.toLocaleString()} PokéDollar`
        )
        .setThumbnail(selectedItem.sprite)
        .setColor('Green');

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('buy_item')
          .setLabel('🛒 Kaufen')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_buy')
          .setLabel('❌ Abbrechen')
          .setStyle(ButtonStyle.Danger)
      );

      await selectInteraction.reply({
        content: `Details for **${selectedItem.name}**:`,
        embeds: [itemEmbed],
        components: [buttons],
      });
      const buttonCollector =
        selectInteraction.channel.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30_000,
          filter: (i) => i.user.id === userId,
        });

      buttonCollector.on('collect', async (buttonInteraction) => {
        await buttonInteraction.deferReply();
        if (buttonInteraction.customId === 'buy_item') {
          const geldAbfragen = await new Promise((resolve, reject) => {
            const query = 'SELECT geld FROM spieler WHERE discordid = ?';
            connection.query(
              query,
              [interaction.user.id],
              function (err, results) {
                if (err) return reject(err);

                if (results.length === 0) {
                  reject('Spieler nicht gefunden');
                } else {
                  resolve(results[0].geld);
                }
              }
            );
          });

          const itemPreis = selectedItem.price;
          if (geldAbfragen >= itemPreis) {
            var query =
              'Insert into item (name, Spieler, beschreibung, sprite) VALUES(?,(Select name from spieler where discordid = ?),?,?)';
            connection.query(query, [
              selectedItem.name,
              interaction.user.id,
              selectedItem.description,
              selectedItem.sprite,
            ]);
            var query =
              'Update spieler set geld = geld - ? where discordid = ?';
            connection.query(query, [itemPreis, interaction.user.id]);

            await buttonInteraction.editReply({
              content: `Du hast **${selectedItem.name}** erfolgreich gekauft!`,
            });
            buttonCollector.stop();
          } else {
            await buttonInteraction.editReply({
              content: `Du hast nicht genug Geld, um **${selectedItem.name}** zu kaufen. Erforderlich: ${itemPreis.toLocaleString()} PokéDollar.`,
            });
            buttonCollector.stop();
            return;
          }
        } else if (buttonInteraction.customId === 'cancel_buy') {
          await buttonInteraction.editReply({
            content: 'Der Kaufprozess wurde abgebrochen.',
          });
          buttonCollector.stop();
        }
      });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          content: '⏳ Selection timed out. Use `/shop` again.',
          embeds: [],
          components: [],
        });
      }
    });
  } else if (category === 'tms') {
    await interaction.reply({
      content: '🧪 TM shop coming soon!',
    });
  }
}

export default {
  data: commandData,
  execute: execute,
};
