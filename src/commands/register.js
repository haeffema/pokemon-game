import { SlashCommandBuilder } from 'discord.js';
import { getUserById } from '../database/user.js';
import { validateTeamWithMessages } from '../utils/pokemonTeam.js';

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

  await interaction.followUp('Team wird überprüft...');

  await validateTeamWithMessages(
    user,
    interaction.options.getString('pokepaste')
  );

  await interaction.followUp(
    'Überprüfung fertig, alle validen Sets registriert.'
  );
}
