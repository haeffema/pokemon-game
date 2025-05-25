import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import connection from '../../database/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };

const commandData = new SlashCommandBuilder()
  .setName('tutor')
  .setDescription('Let your Pokemon learn a Move from the Tutor')
  .addStringOption((option) =>
    option
      .setName('pokemon')
      .setDescription('Your available Pokémon')
      .setRequired(true)
      .setAutocomplete(true)
  );

const execute = async (interaction) => {
  const userId = interaction.user.id;
  const chosenPokemon = interaction.options.getString('pokemon');

  const pokemon = pokemonData[chosenPokemon.toLowerCase()];

  const alltutorMoves = Object.values(pokemon.moves).filter(
    (move) => move.type === 'tutor'
  );

  var query = `
      SELECT attacke from tutor where spieler = (Select name from spieler where discordid = ?) and pokemon = ?;`;
  var tutorResult = await new Promise((resolve, reject) => {
    connection.query(query, [userId, chosenPokemon], function (err, results) {
      if (err) {
        reject('Datenbankfehler: ' + err);
      } else {
        resolve(results);
      }
    });
  });

  let tutorMoves = alltutorMoves.filter(
    (move) =>
      !tutorResult.some(
        (result) =>
          result.attacke.toLowerCase().replace(/\s+/g, '-') === move.name
      )
  );
  if (tutorMoves.length === 0) {
    await interaction.reply(
      `Der Tutor hat deinem ${chosenPokemon} bereits alle verfügbaren Attacken beigebracht.`
    );
    return;
  }

  const chunks = [];
  for (let i = 0; i < tutorMoves.length; i += 25) {
    chunks.push(tutorMoves.slice(i, i + 25));
  }

  const rows = chunks.map((group, index) => {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`tutor-move-select-${index}`)
      .setPlaceholder(`Choose a tutor move (${index + 1}/${chunks.length})`)
      .addOptions(
        group.map((move) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(formatLabel(move.name))
            .setValue(formatLabel(move.name))
        )
      );

    return new ActionRowBuilder().addComponents(selectMenu);
  });

  await interaction.reply({
    content: `Select a tutor move for **${pokemon.name}**:`,
    components: rows.slice(0, 5), // max 5 ActionRows
  });
  const collector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60_000,
    filter: (i) => i.user.id === userId,
  });

  collector.on('collect', async (selectInteraction) => {
    try {
      await selectInteraction.deferReply();
      const selectedMoveName = selectInteraction.values[0];

      const moveEmbed = new EmbedBuilder()
        .setTitle(`Tutor`)
        .setDescription(
          `Der Tutor kann deinem ${chosenPokemon} den Move **${selectedMoveName}** beibringen.\n\n💰 Der Preis hierfür beträgt 5000 PokéDollar, aber dein ${chosenPokemon} kann sich dafür für den Rest seines Lebens daran erinnern.`
        )
        .setThumbnail(
          'https://play.pokemonshowdown.com/sprites/trainers/blackbelt-gen7.png'
        )
        .setColor('Green');

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('buy_move')
          .setLabel('🛒 Kaufen')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_buy_move')
          .setLabel('❌ Abbrechen')
          .setStyle(ButtonStyle.Danger)
      );

      await selectInteraction.editReply({
        embeds: [moveEmbed],
        components: [buttons],
      });
      collector.stop();
      const buttonCollector =
        selectInteraction.channel.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 120_000,
          filter: (i) => i.user.id === userId,
        });

      buttonCollector.on('collect', async (buttonInteraction) => {
        await buttonInteraction.deferReply();
        if (buttonInteraction.customId === 'buy_move') {
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

          const tutorPreis = 5000;
          if (geldAbfragen >= tutorPreis) {
            var query =
              'Insert ignore into tutor (attacke, pokemon, spieler) VALUES(?,?,(Select name from spieler where discordid = ?))';
            connection.query(query, [
              selectedMoveName,
              chosenPokemon,
              interaction.user.id,
            ]);
            var query =
              'Update spieler set geld = geld - ? where discordid = ?';
            connection.query(query, [tutorPreis, interaction.user.id]);
            await buttonInteraction.editReply({
              content: `Der Tutor hat deinem ${chosenPokemon} den Move **${selectedMoveName}** erfolgreich beigebracht!`,
            });
            buttonCollector.stop();
          } else {
            await buttonInteraction.editReply({
              content: `Du hast nicht genug Geld, um den Tutor zu bezahlen und deinem ${chosenPokemon} den Move **${selectedMoveName}** beizubringen. Erforderlich: ${tutorPreis} PokéDollar.`,
            });
            buttonCollector.stop();
            return;
          }
        } else if (buttonInteraction.customId === 'cancel_buy_move') {
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
        content: '⏳ Selection timed out. Use /tutor again.',
        embeds: [],
        components: [],
      });
    }
  });
};

export default {
  data: commandData,
  execute: execute,
};

const formatLabel = (name) => {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
