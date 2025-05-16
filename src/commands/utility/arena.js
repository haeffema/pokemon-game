import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import itemData from '../../data/quest_items.json' with { type: 'json' };
import bot from '../../utils/client.js';
import config from '../../utils/config.json' with { type: 'json' };

const commandData = new SlashCommandBuilder()
  .setName('arena')
  .setDescription('ADMIN: Set Result of an active Arena Challenge')
  .addStringOption((option) =>
    option
      .setName('player')
      .setDescription('The Player who challenged the Arena')
      .setRequired(true)
      .addChoices(
        { name: 'Julian', value: 'Julian' },
        { name: 'Lara', value: 'Lara' },
        { name: 'Luis', value: 'Luis' },
        { name: 'Tim', value: 'Tim' },
        { name: 'Jan', value: 'Jan' },
        { name: 'Max', value: 'Max' }
      )
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
  );

export async function execute(interaction) {
  if (
    interaction.user.id != '360366344635547650' &&
    interaction.user.id != '326305842427330560'
  ) {
    await interaction.reply(
      'Dieser Befehl kann nur von den **Arenaleitern** eingesetzt werden um über den Ausgang einer Arena Challenge zu entscheiden. Versuch es besser nicht nochmal, sonst wird dein Geld auf 0 gesetzt!'
    );
    return;
  }
  const player = interaction.options.getString('player');
  const victory = interaction.options.getString('victory');

  var query =
    'SELECT * FROM challenge c inner join spieler s on c.spieler = s.name where spieler = ? and aktiv = 1';
  var challenge = await new Promise((resolve, reject) => {
    connection.query(query, [player], function (err, results) {
      if (err) {
        reject('Datenbankfehler: ' + err);
      } else {
        resolve(results[0]);
      }
    });
  });
  if (!challenge) {
    await interaction.reply(
      `Der Spieler ${player} hat keine aktive Arena Challenge!`
    );
    return;
  }
  var query = 'Update challenge set aktiv = 0, sieg = ? where id = ?';
  connection.query(query, [victory, challenge.id]);

  const now = new Date();
  const serverTimeZone = 'Europe/Berlin';

  const year = now.toLocaleString('en-US', {
    year: 'numeric',
    timeZone: serverTimeZone,
  });
  const month = now.toLocaleString('en-US', {
    month: '2-digit',
    timeZone: serverTimeZone,
  });
  const day = now.toLocaleString('en-US', {
    day: '2-digit',
    timeZone: serverTimeZone,
  });
  // Neues Date-Objekt in lokaler Zeit, aber auf Basis Berliner Zeit
  const heute = new Date(`${year}-${month}-${day}`);

  if (victory == 'Victory') {
    var query =
      'Update spieler set Orden = Orden + 1, geld = geld + 2000*orden, delay = ? where name = ?';
    connection.query(query, [heute, challenge.spieler]);
    await interaction.reply(
      `Die Herausforderung von ${challenge.spieler} war **erfolgreich**, der Arenaleiter musste sich (aufgrund von Hax) geschlagen geben. Der Spieler bekommt den Orden und kann die nächste Arena in frühestens drei Tagen herausfordern.`
    );

    const { channelId } = config;
    const channel = await bot.channels.fetch(channelId);

    var desc = `Glückwunsch, ${player} hat die ${challenge.Orden + 1}. Arena bezwungen und den Orden erhalten! Aber sei gewarnt, der nächste Arenaleiter wird es dir nicht so einfach machen.`;
    if (challenge.Orden + 1 == 8)
      desc = `Glückwunsch, ${player} hat die ${challenge.Orden + 1}. Arena bezwungen und den Orden erhalten! Respekt, damit hast du alle Arenaleiter besiegt und kannst die Top 4 herausfordern. Stell dich auf noch intensivere Kämpfe ein als bisher, die Top 4 kennen keine Gnade...`;
    const successEmbed = new EmbedBuilder()
      .setTitle('Glückwunsche des Professors')
      .setDescription(desc)
      .setColor('Yellow')
      .setThumbnail(
        'https://play.pokemonshowdown.com/sprites/trainers/oak.png'
      );

    await bot.users.send(
      challenge.discordid,
      `Glückwunsch, du hast die ${arenaMapping[challenge.Orden].deutscherName} Arena erfolgreich bezwungen und den ${challenge.Orden + 1}. Orden erhalten! \nDer Arenaleiter hat dir als Belohnung ${2000 * (challenge.Orden + 1)} PokeDollar übergeben sowie ein ganz besonderes Item!`
    );
    await channel.send({ embeds: [successEmbed] });
    var zKristall = itemData[arenaMapping[challenge.Orden].zKristall];
    const itemEmbed = new EmbedBuilder()
      .setTitle(zKristall.name)
      .setDescription(zKristall.description)
      .setColor('Blue')
      .setThumbnail(zKristall.sprite);
    await bot.users.send(interaction.user.id, { embeds: [itemEmbed] });
    var query =
      'Insert ignore into item (name, spieler, beschreibung, sprite) Values(?,?,?,?)';
    connection.query(query, [
      zKristall.name,
      challenge.spieler,
      zKristall.description,
      zKristall.sprite,
    ]);
  } else {
    var query = 'Update spieler set delay = ? where name = ?';
    connection.query(query, [heute, challenge.spieler]);
    await interaction.reply(
      `Die Herausforderung von ${challenge.spieler} ist **gescheitert**, der Arenaleiter hat (wie vorauszusehen war) triumphiert. Der Spieler bekommt eine Sperre für 3 Tage bevor er die Arena erneut herausfordern darf.`
    );
    await bot.users.send(
      challenge.discordid,
      `Schade... leider hast du die **${arenaMapping[challenge.Orden].deutscherName} Arena** nicht bezwingen können! \nDer Arenaleiter hat dir wohl gezeigt wo der Bartel den Most holt, du musst nun drei Tage warten bevor du ihn erneut herausfordern kannst!`
    );
  }
}

export default {
  data: commandData,
  execute: execute,
};

const arenaMapping = [
  {
    typ: 'Normal',
    deutscherName: 'Normal',
    zKristall: 'Normalium Z',
  },
  {
    typ: 'Fire',
    deutscherName: 'Feuer',
    zKristall: 'Firium Z',
  },
  {
    typ: 'Fighting',
    deutscherName: 'Kampf',
    zKristall: 'Fightinium Z',
  },
  {
    typ: 'Ground',
    deutscherName: 'Boden',
    zKristall: 'Groundium Z',
  },
  {
    typ: 'Electric',
    deutscherName: 'Elektro',
    zKristall: 'Electrium Z',
  },
  {
    typ: 'Dragon',
    deutscherName: 'Drache',
    zKristall: 'Dragonium Z',
  },
  {
    typ: 'Dark',
    deutscherName: 'Unlicht',
    zKristall: 'Darkinium Z',
  },
  {
    typ: 'Ghost',
    deutscherName: 'Geist',
    zKristall: 'Ghostium Z',
  },
];
