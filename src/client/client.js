import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { token } from '../config.js';
import { checkForMessagesToSend } from '../utils/message-queue.js';
import { updatePoolIfNeeded } from '../pokemon/pool.js';

const bot = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel],
});

bot.login(token);

bot.once('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
  checkForMessagesToSend(bot);
  updatePoolIfNeeded(bot);
  setInterval(
    () => {
      checkForMessagesToSend(bot);
      updatePoolIfNeeded(bot);
    },
    1000 * 60 * 5
  );
});

export default bot;
