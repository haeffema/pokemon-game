import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import bot from '../../utils/client.js';
import {
  parsePokepaste,
  validateSet,
  uploadToPokePaste,
  formatPokepasteStringForWebsite,
} from '../../utils/pokemon.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };

const commandData = new SlashCommandBuilder()
  .setName('challenge')
  .setDescription('Challenge the next Gym Leader')
  .addStringOption((option) =>
    option
      .setName('team')
      .setDescription('Pokepaste for your Team')
      .setRequired(true)
  );

const execute = async (interaction) => {
  await interaction.deferReply();

  const challengeAktiv = await new Promise((resolve, reject) => {
    const query =
      'SELECT * FROM challenge WHERE spieler = (Select name from spieler where discordid = ?) and aktiv = 1';
    connection.query(query, [interaction.user.id], function (err, results) {
      if (err) return reject(err);

      resolve(results);
    });
  });

  if (challengeAktiv.length > 0) {
    interaction.editReply(
      'Du kannst aktuell keinen Arenaleiter herausfordern weil du noch eine aktive Challenge hast oder warten musst weil du die Challenge verloren hast!'
    );
    return;
  }

  const pokepaste = interaction.options.getString('team');
  const allPokemon = pokepaste.split(/ {4}/).filter((p) => p.trim().length > 0);
  console.log('Pokemon im Pokepaste: ' + allPokemon.length);
  let erfolg = 0;
  const typeCounts = {};
  const itemCounts = {};
  var validationMessage = '';
  var numberMessage = '';
  var itemMessage = '';
  var windowsFormattedPokepaste = '';
  for (const pokemon of allPokemon) {
    var parsedPokemon = parsePokepaste(pokemon);
    windowsFormattedPokepaste +=
      parsedPokemon.pokePasteStringFormat + '\r\n\r\n';
    var types = pokemonData[parsedPokemon.name.toLowerCase()].types;
    var item = parsedPokemon.item;

    if (!types) {
      // Fehlerbehandlung, falls das Pokémon nicht gefunden wird
      console.log('No Type found');
      continue;
    }

    for (const type of types) {
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      if (typeCounts[type] == 3) {
        numberMessage += `Dein Team enthält zuviele Pokemon vom Typ '${type}'. Maximal 2 Pokemon desselben Typs sind erlaubt.\n`;
        /*await bot.users.send(
          interaction.user.id, `Too many Pokémon with the type '${type}'. Maximum 2 allowed.`
        );*/
        erfolg--;
      }
    }

    if (item) {
      itemCounts[item] = (itemCounts[item] || 0) + 1;

      if (itemCounts[item] > 1) {
        itemMessage += `Das Item '${item}' wurde mehrfach verwendet. Jedes Item darf nur einmal im Team vorkommen.\n`;
        erfolg--;
      }
    }

    const result = await validateSet(parsedPokemon, interaction.user.id);

    /*await bot.users.send(
      interaction.user.id,
      `${result.message}`
    );*/

    if (result.success === true) {
      erfolg++;
    } else {
      validationMessage += result.message + '\n';
    }
  }

  if (erfolg !== allPokemon.length) {
    await interaction.editReply(
      'Dein Pokemon Team ist nicht zulässig, bitte korrigiere die untern aufgeführten Fehler und fordere den Arenaleiter erneut heraus!'
    );
    const errorEmbed = new EmbedBuilder()
      .setTitle('Errorliste')
      .setDescription(numberMessage + itemMessage + validationMessage)
      .setColor('Red')
      .setFooter({ text: 'Alles korrigieren und neu probieren :)' });
    await bot.users.send(interaction.user.id, {
      embeds: [errorEmbed],
    });
    return;
  }
  if (allPokemon.length == 6) {
    var query = 'SELECT * FROM spieler where discordid = ?';
    var results = await new Promise((resolve, reject) => {
      connection.query(query, [interaction.user.id], function (err, results) {
        if (err) {
          reject('Datenbankfehler: ' + err);
        } else {
          resolve(results);
        }
      });
    });
    if (results.length > 0) {
      const formattedTeam = formatPokepasteStringForWebsite(
        windowsFormattedPokepaste
      );
      var arenaNumber = results[0].Orden++;

      const pokepasteUrl = await uploadToPokePaste(formattedTeam, {
        title: `${results[0].Name}'s Team für die ${arenaNumber}. Arena`,
        author: 'Orion',
      });
      var query =
        'Insert into challenge (spieler, aktiv, arena, team) VALUES (?,?,?,?)';
      connection.query(query, [
        results[0].Name,
        1,
        arenas[results[0].Orden],
        pokepasteUrl,
      ]);
      /*await bot.users.send(
        '360366344635547650',
        `${results[0].Name} hat die ${arenas[results[0].Orden]} Arena herausgefordert. Vernichten wir ihn!`
      );
      await bot.users.send(
        '326305842427330560',
        `${results[0].Name} hat die ${arenas[results[0].Orden]} Arena herausgefordert. Vernichten wir ihn!`
      );*/

      await interaction.editReply(
        'Dein Team ist zulässig und deine Herausforderung wurde an den Arenaleiter gesendet, er wird dich in kürze kontaktieren. Viel Glück, du wirst es brauchen!'
      );
      await bot.users.send(
        interaction.user.id,
        `Dein Team für die Arena im Pokepaste Format: ${pokepasteUrl}. Du darfst nur mit diesem Team in der Arena antreten und keine Änderungen mehr vornehmen!`
      );
    }
  } else {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_yes')
        .setLabel('Sicher')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('confirm_no')
        .setLabel('Nein ich habe doch Angst bekommen')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.editReply({
      content:
        'Dein Team ist zulässig, aber bist du sicher, dass du mit weniger als 6 Pokémon gegen den Arenaleiter antreten willst? Der Kampf wird auch mit 6 schon schwer genug 😉',
      components: [row],
    });

    try {
      const buttonInteraction = await message.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: (i) => i.user.id === interaction.user.id,
      });
      if (buttonInteraction.customId === 'confirm_yes') {
        var query = 'SELECT * FROM spieler where discordid = ?';
        var results = await new Promise((resolve, reject) => {
          connection.query(
            query,
            [interaction.user.id],
            function (err, results) {
              if (err) {
                reject('Datenbankfehler: ' + err);
              } else {
                resolve(results);
              }
            }
          );
        });
        if (results.length > 0) {
          const formattedTeam = formatPokepasteStringForWebsite(
            windowsFormattedPokepaste
          );
          const pokepasteUrl = await uploadToPokePaste(formattedTeam, {
            title:
              results[0].Name +
              's Team für die ' +
              results[0].Orden +
              1 +
              '. Arena',
            author: 'Orion',
          });
          var query =
            'Insert into challenge (spieler, aktiv, arena, team) VALUES (?,?,?,?)';
          connection.query(query, [
            results[0].Name,
            1,
            arenas[results[0].Orden],
            pokepasteUrl,
          ]);
          /*await bot.users.send(
            '360366344635547650',
            `${results[0].Name} has challenged the ${arenas[results[0].Orden]} Arena. Let's give him an epic battle.`
          );
          await bot.users.send(
            '326305842427330560',
            `${results[0].Name} has challenged the ${arenas[results[0].Orden]} Arena. Let's give him an epic battle.`
          );*/

          await buttonInteraction.reply(
            'Deine Herausforderung mit weniger als **6 Pokemon!!!!** wurde an den Arenaleiter gesendet, er wird dich in kürze kontaktieren. Du wirst diesmal Glück mehr als alles andere brauchen, also möge dein Eisstrahl das Yveltal einfrieren!'
          );
          await bot.users.send(
            interaction.user.id,
            `Dein Team für die Arena im Pokepaste Format: ${pokepasteUrl}. Du darfst nur mit diesem Team in der Arena antreten und keine Änderungen mehr vornehmen!`
          );
        }
      } else {
        await buttonInteraction.reply(
          'Du hast die Herausforderung mit weniger als 6 Pokemon abgebrochen... glaub mir das war eine gute Entscheidung'
        );
      }
    } catch (err) {
      await message.edit({
        content: 'Keine Antwort erhalten. Vorgang abgebrochen.',
        components: [],
      });
      return;
    }
  }
};

export default {
  data: commandData,
  execute: execute,
};

var arenas = [
  'Normal',
  'Fire',
  'Fighting',
  'Ground',
  'Electric',
  'Dragon',
  'Dark',
  'Ghost',
];
