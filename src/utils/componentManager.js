const activeCollectors = new Map();

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
