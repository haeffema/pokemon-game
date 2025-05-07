import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config.json' with { type: 'json' };
import { checkForMessagesToSend } from './message-queue.js';

const { token } = config;

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
  setInterval(
    () => {
      checkForMessagesToSend(bot);
    },
    1000 * 60 * 5
  ); // -> alle 5 Minuten
});

// Exportiere den Bot
export default bot;
