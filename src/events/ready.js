import { Events } from 'discord.js';
import cron from 'node-cron';
import { dailyReset } from '../database/user.js';
import { setNewPool } from '../database/pool.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  console.info(`Logged in as ${client.user.tag}!`);

  /** cron.schedule('* * * * *', () => {
    console.log('Checking for messages to send...');
  }); */

  cron.schedule('0 0 * * *', async () => {
    console.log('Starting daily reset...');
    await dailyReset();
    await setNewPool();
  });
}
