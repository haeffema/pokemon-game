import {
  EmbedBuilder,
  AttachmentBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { channelId, defaultSprite } from '../config.js';
import { client } from './client.js';
import { getUnsentMessages, markMessagesAsSent } from '../database/messages.js';

export async function sendQueuedMessages() {
  const unsentMessages = await getUnsentMessages();

  if (unsentMessages && unsentMessages.length > 0) {
    console.log('Unsent messages found: ', unsentMessages.length);
    const messageIdsToMarkAsSent = unsentMessages.map((msg) => msg.id);

    for (const message of unsentMessages) {
      await sendMessage(message, message.receiver);
    }
    await markMessagesAsSent(messageIdsToMarkAsSent);
  }
}

export async function sendMessage(
  content,
  receiver = 'channel',
  components = []
) {
  if (typeof receiver !== 'string') {
    return await _sendMessage(receiver, content, components);
  }

  if (receiver === 'channel') {
    const channel = await client.channels.fetch(channelId);
    return await _sendMessage(channel, content, components);
  } else {
    const user = await client.users.fetch(receiver);
    return await _sendMessage(user, content, components);
  }
}

async function _sendMessage(receiver, content, components) {
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
      const attachment = new AttachmentBuilder(content.image, {
        name: 'image.png',
      });
      embed.setImage('attachment://image.png');
      sendableContent.files = [attachment];
    }

    if (content.gif) {
      const attachment = new AttachmentBuilder(content.gif, {
        name: 'gif.gif',
      });
      embed.setImage('attachment://gif.gif');
      sendableContent.files = [attachment];
    }

    if (content.fields) {
      embed.addFields(...content.fields);
    }

    sendableContent.embeds = [embed];
  }

  try {
    if (receiver instanceof ChatInputCommandInteraction) {
      if (receiver.deferred || receiver.replied) {
        return await receiver.followUp({
          ...sendableContent,
        });
      } else {
        return await receiver.reply({
          ...sendableContent,
        });
      }
    }
    return await receiver.send(sendableContent);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}
