import { runBattle, setupBattle } from './utils/battle.js';
import { convertSetToPokepaste } from './utils/pokemon.js';

const battle = setupBattle(
  convertSetToPokepaste(
    {
      item: 'Leftovers',
      ability: 'Solid Rock',
      nature: 'Adamant',
      evs: {
        hp: 252,
        atk: 16,
        spd: 240,
      },
      moves: ['Toxic', 'Earthquake', 'Stealth Rock', 'Stone Edge'],
    },
    'Rhyperior'
  ),
  convertSetToPokepaste(
    {
      item: 'Leftovers',
      ability: 'Solid Rock',
      nature: 'Adamant',
      evs: {
        hp: 252,
        atk: 16,
        spd: 240,
      },
      moves: ['Toxic', 'Spikes', 'Stealth Rock', 'Stone Edge'],
    },
    'Rhyperior'
  )
);
runBattle(battle);
