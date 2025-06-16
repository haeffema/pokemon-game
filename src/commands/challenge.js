import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from 'discord.js';
import { getUserById } from '../database/user.js';
import { getActiveChallenge, addChallenge } from '../database/challenge.js';
import { validateTeamWithMessages } from '../utils/pokemonTeam.js';
import { sendMessage } from '../utils/sendMessage.js';
import { awaitInteraction } from '../utils/componentManager.js';
import gymData from '../data/gyms.json' with { type: 'json' };
import { adminIds } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('challenge')
  .setDescription('Challenge the next Gym Leader.')
  .addStringOption((option) =>
    option
      .setName('team')
      .setDescription('Pokepaste url of your team.')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const user = await getUserById(interaction.user.id);

  const activeChallenge = await getActiveChallenge(user.name);

  if (activeChallenge) {
    await sendMessage('Beende zuerst deine aktive Challenge.', interaction);
    return;
  }

  if (user.delay !== 0) {
    await sendMessage(
      `Du musst noch ${user.delay} ${user.delay === 1 ? 'Tag' : 'Tage'} warten bis du erneut kämpfen kannst.`,
      interaction
    );
    return;
  }

  if (user.badges === 8) {
    await sendMessage(
      `Die Top 4 sind noch nicht implementiert, wende dich an Jan und Max.`,
      interaction
    );
    return;
  }

  await sendMessage('Team wird überprüft...', interaction);

  const valid = await validateTeamWithMessages(
    user,
    interaction.options.getString('team'),
    6
  );

  if (!valid.valid) {
    await sendMessage(
      'Behebe die Fehler in dem Team und vordere dann die Arena erneut heraus.',
      interaction
    );
    return;
  }

  let response = '';
  let answer =
    'Die Challenge wurde bestätigt, der Arenaleiter meldet sich bald bei dir.\n\n*Viel Glück! ... Du wirst es brauchen.*';
  if (valid.teamSize < 6) {
    answer =
      'Deine Herausforderung mit weniger als **6 Pokemon!!!!** wurde an den Arenaleiter gesendet, er wird dich in kürze kontaktieren. Du wirst diesmal Glück mehr als alles andere brauchen, also möge dein Eisstrahl das Yveltal einfrieren!';
    const selectionButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('yes')
        .setLabel('Ja, ich will verlieren.')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('no')
        .setLabel('Das war doch alles nur ein schlechter Scherz.')
        .setStyle(ButtonStyle.Danger)
    );
    const message = await sendMessage(
      `Dein Team ist zulässig, aber bist du sicher, dass du mit weniger als 6 Pokémon gegen den Arenaleiter antreten willst? Der Kampf wird auch mit 6 schon schwer genug 😉`,
      interaction,
      [selectionButtons]
    );

    response = await awaitInteraction(user.discordId, message);
  } else {
    const selectionButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('yes')
        .setLabel('Ja.')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('no')
        .setLabel('Ich habe doch Angst.')
        .setStyle(ButtonStyle.Danger)
    );
    const message = await sendMessage(
      'Bestätige bitte deine Challenge, danach gibt es kein zurück mehr und das Team darf nicht mehr verändert werden.',
      interaction,
      [selectionButtons]
    );

    response = await awaitInteraction(user.discordId, message);
  }

  if (response === 'no') {
    await sendMessage(
      'Die Challenge wurde abgebrochen ... das ist wahrscheinlich auch besser so. Komm wieder wenn du dir sicher bist!',
      interaction
    );
    return;
  }

  await sendMessage(answer, interaction);

  const type = gymData[user.badges].type;

  await addChallenge({
    user: user.name,
    gym: type,
    pokepaste: interaction.options.getString('team'),
  });

  for (const adminId of adminIds) {
    await sendMessage(
      `${user.name} hat die ${type} Arena herausgefordert.`,
      adminId
    );
  }
}
