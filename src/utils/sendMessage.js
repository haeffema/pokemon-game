import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { channelId, defaultSprite } from '../config.js';
import { client } from './client.js';

export async function sendMessage(
  content,
  receiver = 'channel',
  components = []
) {
  switch (receiver) {
    case 'channel': {
      const channel = await client.channels.fetch(channelId);
      return await _sendMessage(channel, content, components);
    }
    default: {
      const user = await client.users.fetch(receiver);
      return await _sendMessage(user, content, components);
    }
  }
}

async function _sendMessage(receiver, content, components) {
  if (content.image) {
    const imageBuffer = content.image;
    const attachment = new AttachmentBuilder(imageBuffer, {
      name: 'image.png',
    });

    const messageEmbed = new EmbedBuilder()
      .setTitle(content.title)
      .setDescription(content.description)
      .setColor(content.color)
      .setImage('attachment://image.png');

    return await receiver.send({
      embeds: [messageEmbed],
      files: [attachment],
      components: components,
    });
  } else if (content.noSprite) {
    const messageEmbed = new EmbedBuilder()
      .setTitle(content.title)
      .setDescription(content.description)
      .setColor(content.color);

    return await receiver.send({
      embeds: [messageEmbed],
      components: components,
    });
  } else if (typeof content === 'string') {
    return await receiver.send(content);
  } else {
    const message = new EmbedBuilder()
      .setTitle(content.title)
      .setDescription(content.description)
      .setColor(content.color || 'Blue')
      .setThumbnail(content.sprite || defaultSprite);
    return await receiver.send({ embeds: [message], components: components });
  }
}
