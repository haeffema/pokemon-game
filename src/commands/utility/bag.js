import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import connection from '../../database/databaseConnection.js';

const commandData = new SlashCommandBuilder()
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
  const chosenItem = interaction.options.getString('item-tm');
  const userId = interaction.user.id;

  switch (category) {
    case 'items':
      var query =
        'SELECT name, beschreibung FROM item where spieler = (Select name from spieler where discordid = ?)';
      var allItemsOfUser = await new Promise((resolve, reject) => {
        connection.query(query, [userId], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results);
          }
        });
      });
      var validItems = allItemsOfUser.map((item) => item.name);
      if (!validItems.includes(chosenItem) && chosenItem != 'AllItems') {
        await interaction.reply({
          content: `❌ Ungültige Auswahl: Das Item '${chosenItem}' existiert nicht oder ist nicht in deinem Besitz.`,
        });
        return;
      } else if (chosenItem == 'AllItems') {
        const lines = allItemsOfUser.map(
          (item) => `**${item.name}**: ${item.beschreibung}`
        );
        let embeds = [];
        let currentDescription = '';

        for (const line of lines) {
          if ((currentDescription + line + '\n\n').length > 4096) {
            embeds.push(
              new EmbedBuilder()
                .setTitle(embeds.length === 0 ? 'Auflistung aller Items' : null)
                .setDescription(currentDescription.trim())
                .setColor('Blue')
            );
            currentDescription = '';
          }

          currentDescription += line + '\n\n';
        }

        if (currentDescription.length > 0) {
          embeds.push(
            new EmbedBuilder()
              .setTitle(embeds.length === 0 ? 'Auflistung aller Items' : null)
              .setDescription(currentDescription.trim())
              .setColor('Blue')
          );
        }

        let isFirst = true;
        for (const embed of embeds) {
          if (isFirst) {
            await interaction.reply({ embeds: [embed] });
            isFirst = false;
          } else {
            await interaction.followUp({ embeds: [embed] });
          }
        }

        return;
      }

      var query = 'SELECT * FROM item where name = ?';
      var item = await new Promise((resolve, reject) => {
        connection.query(query, [chosenItem], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results[0]);
          }
        });
      });

      const itemEmbed = new EmbedBuilder()
        .setTitle(item.name)
        .setDescription(item.beschreibung)
        .setThumbnail(item.sprite)
        .setColor('Blue');
      await interaction.reply({ embeds: [itemEmbed] });
      break;
    case 'tms':
      var query =
        'SELECT id, attacke, typ, kategorie FROM tm_spieler ts inner join tm on ts.tm = tm.id where spieler = (Select name from spieler where discordid = ?)';
      var allTMsOfUser = await new Promise((resolve, reject) => {
        connection.query(query, [userId], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results);
          }
        });
      });
      var validTMs = allTMsOfUser.map((tm) => tm.id + ': ' + tm.attacke);
      if (!validTMs.includes(chosenItem) && chosenItem != 'AllTMs') {
        await interaction.reply({
          content: `❌ Ungültige Auswahl: Die TM '${chosenItem}' existiert nicht oder ist nicht in deinem Besitz.`,
        });
        return;
      } else if (chosenItem == 'AllTMs') {
        const lines = allTMsOfUser.map(
          (tm) => `**${tm.id} ${tm.attacke}**: ${tm.kategorie} ${tm.typ} Move`
        );
        let embeds = [];
        let currentDescription = '';

        for (const line of lines) {
          if ((currentDescription + line + '\n\n').length > 4096) {
            embeds.push(
              new EmbedBuilder()
                .setTitle(embeds.length === 0 ? 'Auflistung aller TMs' : null)
                .setDescription(currentDescription.trim())
                .setColor('Blue')
            );
            currentDescription = '';
          }

          currentDescription += line + '\n\n';
        }

        if (currentDescription.length > 0) {
          embeds.push(
            new EmbedBuilder()
              .setTitle(embeds.length === 0 ? 'Auflistung aller TMs' : null)
              .setDescription(currentDescription.trim())
              .setColor('Blue')
          );
        }

        let isFirst = true;
        for (const embed of embeds) {
          if (isFirst) {
            await interaction.reply({ embeds: [embed] });
            isFirst = false;
          } else {
            await interaction.followUp({ embeds: [embed] });
          }
        }

        return;
      }

      var query = 'SELECT * FROM tm where id = ?';
      var tm = await new Promise((resolve, reject) => {
        connection.query(
          query,
          [chosenItem.split(':')[0]],
          function (err, results) {
            if (err) {
              reject('Datenbankfehler: ' + err);
            } else {
              resolve(results[0]);
            }
          }
        );
      });

      const tmEmbed = new EmbedBuilder()
        .setTitle(tm.id + ': ' + tm.attacke)
        .setThumbnail(
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-' +
            tm.typ.toLowerCase() +
            '.png'
        )
        .addFields(
          { name: 'Type', value: tm.typ.toString(), inline: true },
          { name: 'Category', value: tm.kategorie.toString(), inline: true },
          {
            name: 'Power',
            value: tm.stärke !== null ? tm.stärke.toString() : '-',
            inline: true,
          },
          {
            name: 'Accuracy',
            value: tm.genauigkeit !== null ? tm.genauigkeit.toString() : '-',
            inline: true,
          },
          { name: 'PP', value: tm.pp.toString(), inline: true }
        )
        .setColor('Blue');
      await interaction.reply({ embeds: [tmEmbed] });
      break;
    default:
      await interaction.reply('Invalid category selected.');
  }
}

export default {
  data: commandData,
  execute: execute,
};
