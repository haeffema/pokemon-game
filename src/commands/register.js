import { SlashCommandBuilder } from 'discord.js';
import { getUserById } from '../database/user.js';
import { validateTeamWithMessages } from '../utils/pokemonTeam.js';
import { sendMessage } from '../utils/sendMessage.js';

export const data = new SlashCommandBuilder()
  .setName('register')
  .setDescription('Register multiple Pokemon sets using a pokepaste link')
  .addStringOption((option) =>
    option
      .setName('pokepaste')
      .setDescription('Pokepaste for your Pokemon')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const user = await getUserById(interaction.user.id);

  await sendMessage('Team wird überprüft...', interaction);

  await validateTeamWithMessages(
    user,
    interaction.options.getString('pokepaste')
  );

  await sendMessage(
    'Überprüfung fertig, alle validen Sets registriert.',
    interaction
  );
}
