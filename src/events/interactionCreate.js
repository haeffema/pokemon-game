import { Events } from 'discord.js';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (interaction.member) {
      await interaction.reply({
        content: "Only works in DM's!",
        ephemeral: true,
      });
      return;
    }

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
      console.log(error);
    }
  } else if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      if (command.autocomplete) {
        await command.autocomplete(interaction);
      } else {
        console.warn(
          `Command ${interaction.commandName} has autocomplete options but no 'autocomplete' handler.`
        );
      }
    } catch (error) {
      console.error(
        `Error handling autocomplete for ${interaction.commandName}:`,
        error
      );
    }
  }
}
