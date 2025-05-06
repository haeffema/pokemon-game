import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';

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
