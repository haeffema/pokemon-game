import showdown from 'pokemon-showdown';
const { Battle, Teams } = showdown;

const trainerID = 'p1';
const botID = 'p2';

export function generateRandomSet(pokemon) {
  if (pokemon.sets.length == 0) {
    throw 'no sets found'
  }
  const set = pokemon.sets[Math.floor(Math.random() * pokemon.sets.length)]
  let evs = 'EVs:'
  const evConverter = {
    hp: 'HP',
    atk: 'Atk',
    def: 'Def',
    spa: 'SpA',
    spd: 'SpD',
    spe: 'Spe'
  }
  for (let [key, value] of Object.entries(set.evs)) {
    const keyStr = evConverter[key]
    if (key == Object.keys(set.evs)[0]) {
      evs += ` ${value} ${keyStr}`
    }
    else {
      evs += ` / ${value} ${keyStr}`
    }
  }
  let moveStr = ''
  for(let move of set.moves) {
    moveStr += '\n- ' + move
  }
  return `${pokemon.name} @ ${set.item}\nAbility: ${set.ability}\n${evs}\n${set.nature} Nature${moveStr}`
}

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
