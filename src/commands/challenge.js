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
    await interaction.followUp(
      'Beende zuerst deine aktive Challenge um eine neue zu starten.'
    );
    return;
  }

  if (user.delay !== 0) {
    await interaction.followUp(
      `Du musst noch ${user.delay} Tage warten bis du erneut kämpfen kannst.`
    );
    return;
  }

  await interaction.followUp('Team wird überprüft...');

  const valid = await validateTeamWithMessages(
    user,
    interaction.options.getString('team'),
    6
  );

  if (!valid.valid) {
    return;
  }

  let response = '';

  if (valid.teamSize < 6) {
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
      `Nur ${valid.teamSize} Pokemon? Da ist wohl jemand übermotiviert.\nBestätige bitte deine Challenge, danach gibt es kein zurück mehr und das Team darf nicht mehr verändert werden.`,
      user.discordId,
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
      user.discordId,
      [selectionButtons]
    );

    response = await awaitInteraction(user.discordId, message);
  }

  if (response === 'no') {
    await sendMessage(
      'Die Challenge wurde abgebrochen ... das ist wahrscheinlich auch besser so. Komm wieder wenn du dir sicher bist!',
      user.discordId
    );
    return;
  }

  await sendMessage(
    'Die Challenge wurde bestätigt, der Arenaleiter meldet sich bald bei dir.\n\n*Viel Glück! ... Du wirst es brauchen.*',
    user.discordId
  );

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
