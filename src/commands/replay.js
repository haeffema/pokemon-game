import { SlashCommandBuilder } from 'discord.js';
import { getUserById } from '../database/user.js';

import { getAllChallengesForUser } from '../database/challenge.js';
import { sendMessage } from '../utils/sendMessage.js';

export const data = new SlashCommandBuilder()
  .setName('replay')
  .setDescription('Sends a message with all your replays at the current gym.');

export async function execute(interaction) {
  await interaction.deferReply();

  const user = await getUserById(interaction.user.id);

  let currentGym = '';
  let description = '';

  for (const challenge of await getAllChallengesForUser(user.name)) {
    if (challenge.active === 1) {
      continue;
    }
    if (challenge.gym !== currentGym) {
      if (description !== '') {
        await sendMessage(
          { title: currentGym, sprite: user.sprite, description: description },
          interaction
        );
      }
      currentGym = challenge.gym;
      description = challenge.replay;
    } else {
      description += `\n\n${challenge.replay}`;
    }
  }
  if (description !== '') {
    await sendMessage(
      { title: currentGym, sprite: user.sprite, description: description },
      interaction
    );
  }
}
