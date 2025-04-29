import { Client, GatewayIntentBits, Partials } from 'discord.js';
import config from './config.json' with { type: 'json' };

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
});

// Exportiere den Bot
export default bot;
