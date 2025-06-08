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
      'Du kannst den Arenaleiter nicht nochmal herausfordern, weil du aktuell noch eine aktive Herausforderung hast. Schließe diese zuerst ab.'
    );
    return;
  }

  const spieler = await new Promise((resolve, reject) => {
    const query = 'SELECT * FROM spieler WHERE discordid = ?';
    connection.query(query, [interaction.user.id], function (err, results) {
      if (err) return reject(err);

      resolve(results[0]);
    });
  });
  const dbDatum = new Date(spieler.delay);
  dbDatum.setHours(0, 0, 0, 0);

  // Heute in Berliner Zeit berechnen
  const now = new Date();
  const serverTimeZone = 'Europe/Berlin';

  const year = now.toLocaleString('en-US', {
    year: 'numeric',
    timeZone: serverTimeZone,
  });
  const month = now.toLocaleString('en-US', {
    month: '2-digit',
    timeZone: serverTimeZone,
  });
  const day = now.toLocaleString('en-US', {
    day: '2-digit',
    timeZone: serverTimeZone,
  });
  const hour = now.toLocaleString('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: serverTimeZone,
  });

  // Neues Date-Objekt in lokaler Zeit, aber auf Basis Berliner Zeit
  const heute = new Date(`${year}-${month}-${day}T00:00:00`);
  const erlaubtesDatum = new Date(dbDatum);
  erlaubtesDatum.setDate(erlaubtesDatum.getDate() + 3);

  if (heute < erlaubtesDatum) {
    const diffInMs = erlaubtesDatum - heute;
    const diffInTagen = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); // Aufrunden, falls Uhrzeit noch nicht erreicht

    const erlaubtesDatumString = erlaubtesDatum.toLocaleDateString('de-DE');

    interaction.editReply(
      `Du kannst aktuell keinen Arenaleiter herausfordern, weil du noch ${diffInTagen} Tag(e) warten musst!\n` +
        `Deine nächste Herausforderung für den **${spieler.Orden + 1}. Orden** ist ab dem ${erlaubtesDatumString} möglich.`
    );
    return;
  }

  const pokepaste = interaction.options.getString('team');
  const allPokemon = pokepaste.split(/ {4}/).filter((p) => p.trim().length > 0);
  console.log('Pokemon im Pokepaste: ' + allPokemon.length);
  if (allPokemon.length > 6) {
    interaction.editReply(
      `Dein Team enthält mehr als 6 Pokemon, dass wäre nicht ganz fair oder ;)`
    );
    return;
  }
  let erfolg = 0;
  const typeCounts = {};
  const itemCounts = {};
  var validationMessage = '';
  var numberMessage = '';
  var itemMessage = '';
  var windowsFormattedPokepaste = '';
  for (const pokemon of allPokemon) {
    var parsedPokemon = parsePokepaste(pokemon);
    if (parsedPokemon != null) {
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
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_yes')
        .setLabel('Sicher')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('confirm_no')
        .setLabel('Doch noch nicht')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.editReply({
      content:
        'Dein Team ist zulässig, bist du sicher, dass du mit diesem Team gegen den Arenaleiter antreten willst? Du darfst dannach keine Änderungen mehr vornehmen.',
      components: [row],
    });
    try {
      const buttonInteraction = await message.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: (i) => i.user.id === interaction.user.id,
      });
      if (buttonInteraction.customId === 'confirm_yes') {
        await buttonInteraction.deferReply();

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
          const ordenNumber = parseInt(results[0].Orden) + 1;
          const pokepasteUrl = await uploadToPokePaste(formattedTeam, {
            title: `${results[0].Name}'s Team für die ${ordenNumber}. Arena`,
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
          await bot.users.send(
            '360366344635547650',
            `${results[0].Name} hat die ${arenas[results[0].Orden]} Arena herausgefordert. Vernichten wir ihn!`
          );
          await bot.users.send(
            '326305842427330560',
            `${results[0].Name} hat die ${arenas[results[0].Orden]} Arena herausgefordert. Vernichten wir ihn!`
          );

          await buttonInteraction.editReply(
            'Deine Herausforderung wurde an den Arenaleiter gesendet, er wird dich in kürze kontaktieren. Viel Glück, du wirst es brauchen!'
          );
          await bot.users.send(
            buttonInteraction.user.id,
            `Dein Team für die Arena im Pokepaste Format: ${pokepasteUrl}. Du darfst nur mit diesem Team in der Arena antreten und keine Änderungen mehr vornehmen!`
          );
        }
      } else {
        await buttonInteraction.reply(
          'Die Angst hat überhand genommen und du hast die Herausforderung abgebrochen.'
        );
      }
    } catch (error) {
      await message.edit({
        content:
          'Keine Antwort erhalten. Vorgang abgebrochen, nutze /challenge erneut.',
        components: [],
      });
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
          const ordenNumber = parseInt(results[0].Orden) + 1;
          const pokepasteUrl = await uploadToPokePaste(formattedTeam, {
            title: `${results[0].Name}'s Team für die ${ordenNumber}. Arena`,
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
          await bot.users.send(
            '360366344635547650',
            `${results[0].Name} has challenged the ${arenas[results[0].Orden]} Arena. Let's give him an epic battle.`
          );
          await bot.users.send(
            '326305842427330560',
            `${results[0].Name} has challenged the ${arenas[results[0].Orden]} Arena. Let's give him an epic battle.`
          );

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
          'Du hast die Herausforderung mit weniger als 6 Pokemon abgebrochen... glaub mir das war eine gute Entscheidung!'
        );
      }
    } catch (err) {
      await message.edit({
        content:
          'Keine Antwort erhalten. Vorgang abgebrochen, nutze /challenge erneut.',
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
  'Water',
  'Ground',
  'Electric',
  'Dragon',
  'Dark',
  'Ghost',
];
