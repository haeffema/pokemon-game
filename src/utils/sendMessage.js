import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { channelId, defaultSprite } from '../config.js';
import { client } from './client.js';

export async function sendMessage(
  content,
  receiver = 'channel',
  components = []
) {
  if (typeof receiver !== 'string') {
    return await _sendMessage(receiver, content, components, true);
  }
  if (receiver === 'channel') {
    const channel = await client.channels.fetch(channelId);
    return await _sendMessage(channel, content, components);
  } else {
    const user = await client.users.fetch(receiver);
    return await _sendMessage(user, content, components);
  }
}

async function _sendMessage(
  receiver,
  content,
  components,
  interaction = false
) {
  const sendableContent = {};
  if (components.length > 0) {
    sendableContent.components = components;
  }
  if (typeof content === 'string') {
    sendableContent.content = content;
  } else {
    const embed = new EmbedBuilder()
      .setTitle(content.title)
      .setColor(content.color || 'Blue');
    if (!content.noSprite) {
      embed.setThumbnail(content.sprite || defaultSprite);
    }
    if (content.description) {
      embed.setDescription(content.description);
    }
    if (content.image) {
      const imageBuffer = content.image;
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: 'image.png',
      });
      embed.setImage('attachment://image.png');
      sendableContent.files = [attachment];
    }
    if (content.fields) {
      for (const field of content.fields) {
        embed.addFields(field);
      }
    }
    sendableContent.embeds = [embed];
  }
  if (interaction) {
    return await receiver.followUp(sendableContent);
  }
  return await receiver.send(sendableContent);
}
