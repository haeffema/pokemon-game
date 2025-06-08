import { SlashCommandBuilder } from 'discord.js';
import itemData from '../data/items/questItems.json' with { type: 'json' };
import { adminIds } from '../config.js';
import { getAllUsers, getUserById, updateUser } from '../database/user.js';
import { getActiveChallenge, updateChallenge } from '../database/challenge.js';
import { sendMessage } from '../utils/sendMessage.js';

export const data = new SlashCommandBuilder()
  .setName('arena')
  .setDescription('ADMIN: Set Result of an active Arena Challenge')
  .addStringOption((option) =>
    option
      .setName('player')
      .setDescription('The Player who challenged the Arena')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption((option) =>
    option
      .setName('victory')
      .setDescription('The Result of the Arena Battle')
      .setRequired(true)
      .addChoices(
        { name: 'Victory', value: 'Victory' },
        { name: 'Defeat', value: 'Defeat' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('replay')
      .setDescription('The replay of the Gym Battle')
      .setRequired(true)
  );

export async function execute(interaction) {
  if (!adminIds.includes(interaction.user.id)) {
    const user = await getUserById(interaction.user.id);
    user.money--;
    await updateUser(user);
    await interaction.reply(
      'Dieser Befehl kann nur von den **Arenaleitern** eingesetzt werden um über den Ausgang einer Arena Challenge zu entscheiden. Dir wurde 1 PokeDollar abegezogen!'
    );
    return;
  }
  const player = await getUserById(interaction.options.getString('player'));
  const victory = interaction.options.getString('victory');
  const replay = interaction.options.getString('replay');

  if (!player) {
    await interaction.reply(
      'Der Spieler existiert nicht, oder hat keine aktive challenge.'
    );
    return;
  }

  await interaction.deferReply();

  const activeChallenge = await getActiveChallenge(player.name);

  activeChallenge.active = 0;
  activeChallenge.status = victory;
  activeChallenge.replay = replay;

  await updateChallenge(activeChallenge);

  if (victory === 'Victory') {
    player.badges += 1;
    const price = 2000 * player.badges;
    player.money += price;

    const adminMessage = `Die Herausforderung von ${player.name} war **erfolgreich**, der Arenaleiter musste sich (aufgrund von Hax) geschlagen geben, der Spieler bekommt seine Belohnungen.`;
    await interaction.followUp(adminMessage);
    for (const adminId of adminIds) {
      if (adminId === interaction.user.id) continue;
      await sendMessage(adminId, adminMessage);
    }
    await sendMessage(
      player.discordId,
      `Glückwunsch, du hast die ${arenaMapping[player.badges - 1].translated} Arena erfolgreich bezwungen und den Orden erhalten! \nDer Arenaleiter hat dir als Belohnung ${price} PokeDollar übergeben sowie ein ganz besonderes Item!`
    );
    const zCrystal = itemData[arenaMapping[player.badges - 1].zCrystal];
    await sendMessage(player.discordId, {
      title: zCrystal.name,
      description: zCrystal.description,
      color: 'Green',
      sprite: zCrystal.sprite,
    });
    await sendMessage('channel', {
      title: 'Glückwunsche des Professors',
      description: `Glückwunsch, ${player.name} hat die ${player.badges}. Arena bezwungen und den Orden erhalten! Aber sei gewarnt, der nächste Arenaleiter wird es dir nicht so einfach machen.`,
      color: 'Purple',
    });
  } else {
    const adminMessage = `Die Herausforderung von ${player.name} ist **gescheitert**, der Arenaleiter hat (wie vorauszusehen war) triumphiert. Der Spieler bekommt eine Sperre für 3 Tage bevor er die Arena erneut herausfordern darf.`;
    await interaction.followUp(adminMessage);
    for (const adminId of adminIds) {
      if (adminId === interaction.user.id) continue;
      await sendMessage(adminId, adminMessage);
    }
    await sendMessage(
      player.discordId,
      `Schade... leider hast du die **${arenaMapping[player.badges].translated} Arena** nicht bezwingen können! \nDer Arenaleiter hat dir wohl gezeigt wo der Bartel den Most holt, du musst nun drei Tage warten bevor du ihn erneut herausfordern kannst!`
    );
  }
  player.delay = 3;
  await updateUser(player);
}

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused();

  const users = await getAllUsers();

  const filteredUsers = [];

  for (const user of users) {
    const activeChallenge = await getActiveChallenge(user.name);
    if (activeChallenge) {
      if (user.name.toLowerCase().includes(focusedValue.toLowerCase())) {
        filteredUsers.push(user);
      }
    }
  }

  const options = filteredUsers.slice(0, 25).map((user) => ({
    name: user.name,
    value: user.discordId,
  }));

  await interaction.respond(options);
}

const arenaMapping = [
  {
    type: 'Normal',
    translated: 'Normal',
    zCrystal: 'Normalium Z',
  },
  {
    type: 'Fire',
    translated: 'Feuer',
    zCrystal: 'Firium Z',
  },
  {
    type: 'Fighting',
    translated: 'Kampf',
    zCrystal: 'Fightinium Z',
  },
  {
    type: 'Ground',
    translated: 'Boden',
    zCrystal: 'Groundium Z',
  },
  {
    type: 'Electric',
    translated: 'Elektro',
    zCrystal: 'Electrium Z',
  },
  {
    type: 'Dragon',
    translated: 'Drache',
    zCrystal: 'Dragonium Z',
  },
  {
    type: 'Dark',
    translated: 'Unlicht',
    zCrystal: 'Darkinium Z',
  },
  {
    type: 'Ghost',
    translated: 'Geist',
    zCrystal: 'Ghostium Z',
  },
];
