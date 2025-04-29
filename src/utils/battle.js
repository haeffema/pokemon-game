import showdown from 'pokemon-showdown';
const { Battle, Teams } = showdown;

const trainerID = 'p1';
const botID = 'p2';

export function setupBattle(playerTeam, botTeam) {
  const packedPlayer = Teams.pack(Teams.import(playerTeam));
  const packedBot = Teams.pack(Teams.import(botTeam));

  const battle = new Battle({ formatid: 'gen7customgame' });

  battle.setPlayer(trainerID, { name: 'Trainer', team: packedPlayer });
  battle.setPlayer(botID, { name: 'Wild', team: packedBot });

  battle.choose(trainerID, 'team 1');
  battle.choose(botID, 'team 1');

  return battle;
}
