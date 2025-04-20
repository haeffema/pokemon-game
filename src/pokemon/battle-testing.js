import showdown from 'pokemon-showdown';
const { Battle, Teams } = showdown;

// Create a team
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

// Create battle
const battle = new Battle({ formatid: 'gen7customgame' });

// Set players
battle.setPlayer('p1', { name: 'Ash', team: packed });
battle.setPlayer('p2', { name: 'Gary', team: packed });

const choiceRaw = battle.p1.getChoice();
if (choiceRaw) {
  const choice = JSON.parse(choiceRaw);
  const moves = choice.active?.[0]?.moves || [];

  console.log('\n=== MOVE CHOICES for Turn 1 ===');
  moves.forEach((m, i) => {
    console.log(`- [${i + 1}] ${m.move} (${m.pp} PP)`);
  });
} else {
  console.log('\n❌ No choices available (are you calling this too late?)');
}

battle.choose('p1', 'team 1');
battle.choose('p2', 'team 1');

// ✅ NOW get move choices BEFORE any move is picked

const turn2Choice = battle.p1.getChoice();
if (turn2Choice) {
  const choice = JSON.parse(turn2Choice);
  const moves = choice.active?.[0]?.moves || [];

  console.log('\n=== MOVE CHOICES for Turn 2 ===');
  moves.forEach((m, i) => {
    console.log(`- [${i + 1}] ${m.move} (${m.pp} PP)`);
  });
}

console.log('\n=== BATTLE LOG ===');
console.log(battle.log.join('\n'));
