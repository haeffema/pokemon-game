import { SlashCommandBuilder } from 'discord.js';
import itemData from '../data/items/questItems.json' with { type: 'json' };
import gymData from '../data/gyms.json' with { type: 'json' };
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
  await interaction.deferReply();
  if (!adminIds.includes(interaction.user.id)) {
    const user = await getUserById(interaction.user.id);
    user.money--;
    await updateUser(user);
    await sendMessage(
      'Dieser Befehl kann nur von den **Arenaleitern** eingesetzt werden um über den Ausgang einer Arena Challenge zu entscheiden. Dir wurde 1 PokeDollar abegezogen!',
      interaction
    );
    return;
  }
  const player = await getUserById(interaction.options.getString('player'));
  const victory = interaction.options.getString('victory');
  const replay = interaction.options.getString('replay');

  if (!player) {
    await sendMessage(
      'Der Spieler existiert nicht, oder hat keine aktive challenge.',
      interaction
    );
    return;
  }

  const activeChallenge = await getActiveChallenge(player.name);

  activeChallenge.active = 0;
  activeChallenge.status = victory;
  activeChallenge.replay = replay;

  await updateChallenge(activeChallenge);

  const currentGym = gymData[player.badges];

  if (victory === 'Victory') {
    player.badges += 1;
    const newGym = gymData[player.badges];
    player.money += currentGym.reward.money;

    const adminMessage = `Die Herausforderung von ${player.name} war **erfolgreich**, der Arenaleiter musste sich (aufgrund von Hax) geschlagen geben, der Spieler bekommt seine Belohnungen und eine Sperre von drei Tagen.`;
    await sendMessage(adminMessage, interaction);
    for (const adminId of adminIds) {
      if (adminId === interaction.user.id) continue;
      await sendMessage(adminMessage, adminId);
    }
    await sendMessage(
      {
        title: `${currentGym.type} Arena geschafft.`,
        description: `Herzlichen Glückwunsch für das Bezwingen der ${currentGym.type} Arena.\nAls Belohnung erhälst du ${currentGym.reward.money} PokeDollar sowie ein ganz besonderes Item!\n\nPokepaste: ${currentGym.pokepaste}\nDrive: ${currentGym.drive}`,
        sprite: currentGym.sprite,
        color: 'Green',
      },
      player.discordId
    );
    const zCrystal = itemData[currentGym.reward.item];
    await sendMessage(
      {
        title: zCrystal.name,
        description: zCrystal.description,
        color: 'Green',
        sprite: zCrystal.sprite,
      },
      player.discordId
    );
    await sendMessage({
      title: 'Glückwunsche des Professors',
      description: `Glückwunsch, ${player.name} hat die ${player.badges}. Arena bezwungen und den Orden erhalten! Aber sei gewarnt, der nächste Arenaleiter wird es dir nicht so einfach machen.`,
      color: 'Purple',
    });
    await sendMessage(
      {
        title: 'Bereit für eine neue Herausforderung?',
        description: `${newGym.text}\n\n*Du kannst nun in die ${player.badges + 1}. Arena ... wenn du dich traust.*`,
        color: 'Blue',
        sprite: newGym.sprite,
      },
      player.discordId
    );
  } else {
    const adminMessage = `Die Herausforderung von ${player.name} ist **gescheitert**, der Arenaleiter hat (wie vorauszusehen war) triumphiert. Der Spieler bekommt eine Sperre für drei Tage bevor er die Arena erneut herausfordern darf.`;
    await sendMessage(adminMessage, interaction);
    for (const adminId of adminIds) {
      if (adminId === interaction.user.id) continue;
      await sendMessage(adminMessage, adminId);
    }
    await sendMessage(
      {
        title: `${currentGym.type} Arena nicht geschafft.`,
        description: `Schade... leider hast du die **${currentGym.type}** Arena nicht bezwingen können! \nDer Arenaleiter hat dir wohl gezeigt wo der Bartel den Most holt, du musst nun drei Tage warten bevor du ihn erneut herausfordern darfst!`,
        sprite: currentGym.sprite,
        color: 'Red',
      },
      player.discordId
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
