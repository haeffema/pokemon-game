import { Events } from 'discord.js';
import cron from 'node-cron';
import { dailyReset, getAllUsers } from '../database/user.js';
import { getActivePool, setNewPool } from '../database/pool.js';
import { sendMessage, sendQueuedMessages } from '../utils/sendMessage.js';
import { maxEncounters } from '../config.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  console.info(`Logged in as ${client.user.tag}!`);

  cron.schedule('* * * * *', async () => {
    await sendQueuedMessages();
  });

  cron.schedule('0 0 * * *', async () => {
    console.log('Starting daily reset...');
    await dailyReset();
    await setNewPool();
  });

  cron.schedule('0 16 * * *', async () => {
    const users = await getAllUsers();
    for (const user of users) {
      if (user.encounters < maxEncounters) {
        await sendMessage(
          {
            title: 'Erinnerung!',
            description:
              'Hey, es ist 16 Uhr. Vergiss nicht deine Kämpfe. Die Belohnungen jeden Tag zu holen ist sehr wichtig.',
          },
          user.discordId
        );
      }
    }
  });

  cron.schedule('0 20 * * *', async () => {
    const users = await getAllUsers();
    for (const user of users) {
      if (user.encounters < maxEncounters) {
        await sendMessage(
          {
            title: 'Erneute Erinnerung!',
            description:
              'Hey, es ist schon 20 Uhr. Ich sagte dir doch du sollst an deine Kämpfe denken. Es ist wirklich wichtig diese jeden Tag zu bestreiten.',
          },
          user.discordId
        );
      }
    }
  });

  cron.schedule('0 22 * * *', async () => {
    const users = await getAllUsers();
    const activePool = await getActivePool();
    for (const user of users) {
      if (user.encounters < maxEncounters) {
        await sendMessage(
          {
            title: 'ERINNERUNG!',
            description: `Schon 22 Uhr ... nun reicht es mir aber mein Freund, es warten ${activePool.type} Pokemon auf dich, schnapp sie dir!`,
          },
          user.discordId
        );
      }
    }
  });

  cron.schedule('30 23 * * *', async () => {
    const users = await getAllUsers();
    const activePool = await getActivePool();
    for (const user of users) {
      if (user.encounters < maxEncounters) {
        await sendMessage(
          {
            title: 'LETZE ERINNERUNG!',
            description: `Hast du etwa ein Problem ${activePool.type} Pokemon? Wenn es schlecht läuft kommen sie in in mehreren Wochen erst wieder. Nutze also lieber diese Chance.`,
          },
          user.discordId
        );
      }
    }
  });
}
