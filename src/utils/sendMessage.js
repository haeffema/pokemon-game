import { EmbedBuilder } from 'discord.js';
import { channelId, defaultSprite } from '../config.js';
import { client } from './client.js';

export async function sendMessage(receiver, content) {
  switch (receiver) {
    case 'channel': {
      const channel = await client.channels.fetch(channelId);
      await _sendMessage(channel, content);
      break;
    }
    default: {
      const user = await client.users.fetch(receiver);
      await _sendMessage(user, content);
      break;
    }
  }
}

async function _sendMessage(receiver, content) {
  if (content.image) {
    console.log('there is no image support yet');
  } else if (typeof content === 'string') {
    await receiver.send(content);
  } else {
    const message = new EmbedBuilder()
      .setTitle(content.title)
      .setDescription(content.description)
      .setColor(content.color || 'Blue')
      .setThumbnail(content.sprite || defaultSprite);
    await receiver.send({ embeds: [message] });
  }
}
