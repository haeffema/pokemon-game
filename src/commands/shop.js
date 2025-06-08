import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

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
      try {
        await selectInteraction.deferReply();
        const selectedItemName = selectInteraction.values[0];
        const selectedItem = itemData[selectedItemName];

        if (!selectedItem) {
          return await selectInteraction.editReply({
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
        console.log(itemEmbed);

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

        await selectInteraction.editReply({
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
      } catch (error) {
        console.error(
          'Mal wieder unknown interaction aber können wir ignorieren'
        );
      }
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
    const tmsAvailable = await new Promise((resolve, reject) => {
      const query = 'SELECT * FROM tm';
      connection.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    /*const ownedTMs = await new Promise((resolve, reject) => {
      const query = 'SELECT tm FROM tm_spieler WHERE spieler = (Select name from spieler where discordid = ?)';
      connection.query(query, [interaction.user.id], (err, results) => {
        if (err) return reject(err);
        resolve(results.map(row => row.tm));
      });
    });*/

    //var availableForPurchase = tmsAvailable.filter(tm => !ownedTMs.includes(tm.id));
    var availableForPurchase = tmsAvailable;
    var tm100 = availableForPurchase.find((tm) => tm.id === 'TM100');
    var rest = availableForPurchase.filter((tm) => tm.id !== 'TM100');

    availableForPurchase = [...rest, tm100];

    // Embed für den Shop
    const shopEmbed = new EmbedBuilder()
      .setTitle('🛒 Battle Shop')
      .setDescription(
        'Select a TM category below to view more information or purchase individual TMs.'
      )
      .setColor('Blue')
      .setFooter({ text: 'Category: TMs' });

    const tmRangeButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tm_page_1')
        .setLabel('TM 1–25')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('tm_page_2')
        .setLabel('TM 26–50')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('tm_page_3')
        .setLabel('TM 51–75')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('tm_page_4')
        .setLabel('TM 76–100')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [shopEmbed],
      components: [tmRangeButtons],
    });

    var collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 * 15,
    });

    collector.on('collect', async (i) => {
      if (!i.isButton()) return;

      const page = parseInt(i.customId.split('_')[2]);

      const start = (page - 1) * 25;
      const end = start + 25;
      const tmsForPage = availableForPurchase.slice(start, end);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_tm_page_${page}`)
        .setPlaceholder('Wähle eine TM aus')
        .addOptions(
          tmsForPage.map((tm) => ({
            label: `${tm.id}: ${tm.attacke}`,
            value: tm.id.toString(),
            description:
              `${tm.typ} | Stärke: ${tm.stärke} | Genauigkeit: ${tm.genauigkeit}`.slice(
                0,
                50
              ),
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await i.reply({
        content: `Choose a TM from ${start + 1} to ${end}:`,
        components: [row],
      });
      collector.stop();
    });

    var collectorSelect = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
      filter: (i) => i.user.id === userId,
    });

    collectorSelect.on('collect', async (selectInteraction) => {
      try {
        await selectInteraction.deferReply();
        const selectedTM = selectInteraction.values[0];
        var TMData;
        try {
          TMData = await new Promise((resolve, reject) => {
            const query = `SELECT * 
          FROM tm 
          WHERE id = ? 
          AND NOT EXISTS (
            SELECT 1 
            FROM tm_spieler ts
            JOIN spieler s ON ts.spieler = s.name
            WHERE ts.tm = tm.id AND s.discordid = ?
          )`;
            connection.query(
              query,
              [selectedTM, interaction.user.id],
              function (err, results) {
                if (err) return reject(err);

                if (results.length === 0) {
                  reject('Du besitzt **' + selectedTM + '** bereits!');
                } else {
                  resolve(results[0]);
                }
              }
            );
          });
        } catch (error) {
          await selectInteraction.editReply({
            content: error,
          });
          return;
        }

        const tmEmbed = new EmbedBuilder()
          .setTitle(`🧾 ${TMData.id + ': ' + TMData.attacke}`)
          .setDescription(
            `${TMData.typ} | Stärke: ${TMData.stärke} | Genauigkeit: ${TMData.genauigkeit}\n\n💰 Price: 10000 PokéDollar`
          )
          .setThumbnail(
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-' +
              TMData.typ.toLowerCase() +
              '.png'
          )
          .setColor('Green');
        console.log(tmEmbed);
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('buy_tm')
            .setLabel('🛒 Kaufen')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('cancel_tm_buy')
            .setLabel('❌ Abbrechen')
            .setStyle(ButtonStyle.Danger)
        );

        await selectInteraction.editReply({
          content: `Details for **${TMData.id}**:`,
          embeds: [tmEmbed],
          components: [buttons],
        });
        collectorSelect.stop();
        const buttonCollector =
          selectInteraction.channel.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30_000,
            filter: (i) => i.user.id === userId,
          });

        buttonCollector.on('collect', async (buttonInteraction) => {
          await buttonInteraction.deferReply();
          console.log('Interaction deffered');
          if (buttonInteraction.customId === 'buy_tm') {
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

            const itemPreis = 10000;
            if (geldAbfragen >= itemPreis) {
              var query =
                'Insert into tm_spieler (tm, spieler) VALUES(?,(Select name from spieler where discordid = ?))';
              connection.query(query, [TMData.id, interaction.user.id]);
              var query =
                'Update spieler set geld = geld - ? where discordid = ?';
              connection.query(query, [itemPreis, interaction.user.id]);

              await buttonInteraction.editReply({
                content: `Du hast **${TMData.id}** erfolgreich gekauft!`,
              });
              buttonCollector.stop();
            } else {
              await buttonInteraction.editReply({
                content: `Du hast nicht genug Geld, um **${TMData.id}** zu kaufen. Erforderlich: 10000 PokéDollar.`,
              });
              buttonCollector.stop();
              return;
            }
          } else if (buttonInteraction.customId === 'cancel_tm_buy') {
            await buttonInteraction.editReply({
              content: 'Der Kaufprozess wurde abgebrochen.',
            });
            buttonCollector.stop();
          }
        });
      } catch (error) {
        console.error(
          'Mal wieder unknown interaction aber können wir ignorieren'
        );
      }
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          content: '⏳ Selection timed out. Use /shop again.',
          embeds: [],
          components: [],
        });
      }
    });
  }
}
