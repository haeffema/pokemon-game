import dotenv from 'dotenv';

dotenv.config();

export const token = process.env.BOT_TOKEN;
export const clientId = process.env.CLIENT_ID;
export const channelId = process.env.MESSAGE_CHANNEL_ID;
let rawAdminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
export const adminIds = rawAdminIds.map((id) => id.trim());

export const maxEncounters = 35;
export const minNewEncounters = 3;
export const maxNewEncounters = 10;
export const itemDropRate = 0.2222;
export const shinyRate = 4096;

export const defaultSprite =
  'https://play.pokemonshowdown.com/sprites/trainers/oak.png';

if (!token || !clientId || !channelId) {
  throw new Error('Missing required env variables');
}
