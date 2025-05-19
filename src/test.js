import { setupBattle } from './utils/battle.js';
import { writeFile } from 'fs/promises';

async function xds() {
  const team = `Minior @ Choice Scarf  
Ability: Shields Down  
Happiness: 0  
EVs: 4 Atk / 252 SpA / 252 Spe  
Hasty Nature  
- Stealth Rock
- Stealth Rock  
- Frustration  
- Iron Head`;

  const battle = setupBattle(team, team);

  battle.choose('p1', `move 1`);
  battle.choose('p2', `move 2`);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  battle.choose('p1', `move 1`);
  battle.choose('p2', `move 1`);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  writeFile('battle.json', JSON.stringify(battle, null, 2));
  writeFile('mon.json', JSON.stringify(battle.p1.active[0], null, 2));
  writeFile(
    'mon2.json',
    JSON.stringify(battle.p2.active[0].abilityState, null, 2)
  );
}

xds();
