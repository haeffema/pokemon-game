const activeCollectors = new Map();

/**
 * Creates and manages a message component collector for a specific user and message.
 * Ensures only one collector is active per user at a time for button interactions.
 *
 * @param {string} userId The ID of the user to listen for interactions from.
 * @param {object} message The Discord.js Message object to attach the collector to.
 * @param {number} [timeoutMillis=1000 * 60 * 3] The time in milliseconds before the collector expires (default: 3 minutes).
 * @returns {Promise<string|null>} A promise that resolves with the customId of the collected button
 * or null if the collector times out or is stopped by a new interaction.
 */
export async function awaitInteraction(
  userId,
  message,
  timeoutMillis = 1000 * 60 * 3
) {
  if (activeCollectors.has(userId)) {
    const existingCollector = activeCollectors.get(userId);
    if (!existingCollector.ended) {
      existingCollector.stop('new_interaction_requested');
    }
    activeCollectors.delete(userId);
  }

  return new Promise((resolve) => {
    const filter = (i) => {
      if (!i.isButton()) {
        return false;
      }
      if (i.user.id !== userId) {
        i.reply({
          content: "This button isn't for you!",
          ephemeral: true,
        }).catch(console.error);
        return false;
      }
      return true;
    };

    const collector = message.createMessageComponentCollector({
      filter,
      time: timeoutMillis,
    });

    activeCollectors.set(userId, collector);

    collector.on('collect', async (i) => {
      await i.deferUpdate().catch(console.error);
      collector.stop('collected');
      resolve(i.customId);
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' || reason === 'new_interaction_requested') {
        resolve(null);
      }
      activeCollectors.delete(userId);
    });
  });
}
