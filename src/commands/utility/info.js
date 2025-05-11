import {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} from 'discord.js';
import { generatePokepasteForTrainer } from '../../utils/pokemon.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };
import itemDataShop from '../../data/buyable_items.json' with { type: 'json' };
import itemData from '../../data/droppable_items.json' with { type: 'json' };
import path from 'path';
import { createOrdenImage } from '../../utils/orden.js';

const commandData = new SlashCommandBuilder()
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
  const category = interaction.options.getString('category');
  const userId = interaction.user.id;

  switch (category) {
    case 'overview': {
      var query = 'SELECT * FROM spieler where discordid = ?';
      var spieler = await new Promise((resolve, reject) => {
        connection.query(query, [userId], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results[0]);
          }
        });
      });

      const allPokemon = Object.values(pokemonData);
      const allItems = [
        ...Object.values(itemDataShop),
        ...Object.values(itemData),
      ];

      const fights = await new Promise((resolve, reject) => {
        const query =
          'SELECT kämpfe FROM pool WHERE aktiv = 1 and spieler = (Select name from spieler where discordid = ?)';
        connection.query(query, [userId], function (err, results) {
          resolve(results[0].kämpfe);
        });
      });

      query =
        'SELECT * FROM pokemon where spieler = (Select name from spieler where discordid = ?)';
      var ownedPokemon = await new Promise((resolve, reject) => {
        connection.query(query, [userId], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results);
          }
        });
      });
      query =
        'SELECT * FROM item where spieler = (Select name from spieler where discordid = ?)';
      var ownedItems = await new Promise((resolve, reject) => {
        connection.query(query, [userId], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results);
          }
        });
      });
      var pokedexCount = ownedPokemon.length + '/' + allPokemon.length;
      var itemCount = ownedItems.length + '/' + (allItems.length + 8);

      await createOrdenImage(spieler.Orden, spieler.Name);

      const imagePath = path.resolve(`./src/data/orden/${spieler.Name}.png`);
      const attachment = new AttachmentBuilder(imagePath, {
        name: 'orden.png',
      });

      const overviewEmbed = new EmbedBuilder()
        .setTitle('Überblick für Spieler: ' + spieler.Name)
        .setThumbnail(spieler.sprite)
        .addFields(
          {
            name: 'Geld',
            value: new Intl.NumberFormat('de-DE').format(spieler.Geld),
            inline: true,
          },
          { name: 'Orden', value: spieler.Orden.toString(), inline: true }
        )
        .addFields(
          {
            name: 'Pokemon',
            value: pokedexCount.toString(),
            inline: true,
          },
          {
            name: 'Items',
            value: itemCount,
            inline: true,
          }
        )
        .addFields(
          {
            name: 'Kämpfe',
            value: fights.toString(),
            inline: true,
          },
          {
            name: 'Glücksspiel',
            value: new Intl.NumberFormat('de-DE').format(spieler.gewinn),
            inline: true,
          }
        )
        .setColor('Blue')
        .setImage('attachment://orden.png');

      await interaction.reply({ embeds: [overviewEmbed], files: [attachment] });
      break;
    }
    case 'pokedex': {
      const pokedexInfo = await generatePokepasteForTrainer(userId);
      await interaction.reply(`Your Pokedex: ${pokedexInfo}`);
      break;
    }
    default:
      await interaction.reply('Invalid category selected.');
  }
}

export default {
  data: commandData,
  execute: execute,
};
