import showdown from 'pokemon-showdown';
const { Battle, Teams } = showdown;

const team1 = `
Charizard @ Charizardite X  
Ability: Blaze  
EVs: 252 Atk / 252 Spe  
Adamant Nature  
- Flamethrower  
- Roost  
- Dragon Claw  
- Earthquake 
`;

const packed = Teams.pack(Teams.import(team1));

const battle = new Battle({ formatid: 'gen7customgame' });

battle.setPlayer('p1', {
  name: 'Ash',
  team: packed,
});

battle.setPlayer('p2', {
  name: 'Gary',
  team: packed,
});

console.log(battle.p1.getChoice());

battle.choose('p1', 'team 1');
battle.choose('p2', 'team 1');

battle.choose('p1', 'move flamethrower');
battle.choose('p2', 'move flamethrower');

console.log('\n=== BATTLE LOG ===\n');
console.log(battle.log.join('\n'));
