import showdown from 'pokemon-showdown';
const { Battle, Teams, Dex } = showdown;
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const trainerID = 'p1';
const botID = 'p2';

function formatForCalc(pokemon) {
  const set = pokemon.set;
  const evs = set?.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const ivs = set?.ivs || {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
  };
  const nature = set?.nature || 'Serious';

  return new Pokemon(pokemon.battle.gen, set.name, {
    level: pokemon.level,
    ability: pokemon.ability,
    item: set?.item,
    nature: nature,
    evs: evs,
    ivs: ivs,
    boosts: pokemon.boosts,
    gender:
      pokemon.gender === 'M' ? 'M' : pokemon.gender === 'F' ? 'F' : undefined,
    hp: pokemon.hp,
    maxhp: pokemon.maxhp,
  });
}

async function findBestMove(attackerShowdown, defenderShowdown) {
  const gen = Generations.get(attackerShowdown.battle.gen);
  const attacker = formatForCalc(attackerShowdown);
  const defender = formatForCalc(defenderShowdown);
  const moves = attackerShowdown.set.moves;
  let bestMoveIndex = -1;
  let maxDamage = -1;
  for (let i = 0; i < moves.length; i++) {
    const moveName = moves[i];
    const move = new Move(gen, moveName);
    const field = new Field({
      weather: attackerShowdown.battle.field.weather || undefined,
      terrain: attackerShowdown.battle.field.terrain || undefined,
      defenderSide: {
        reflect: defenderShowdown.volatiles['reflect']?.active || false,
        lightScreen: defenderShowdown.volatiles['lightscreen']?.active || false,
        auroraVeil: defenderShowdown.volatiles['auroraveil']?.active || false,
      },
      attackerSide: {
        helpingHand: attackerShowdown.volatiles['helpinghand']?.active || false,
      },
    });
    const result = calculate(gen, attacker, defender, move, field);
    const possibleDamage = result.damage;

    if (possibleDamage && possibleDamage.length > 0) {
      const currentMaxDamage = Math.max(...possibleDamage);
      if (currentMaxDamage > maxDamage) {
        maxDamage = currentMaxDamage;
        bestMoveIndex = i;
      }
    }
  }
  return bestMoveIndex + 1;
}

async function getTrainerMove(moves, ownPokemon, enemyPokemon) {
  return 1;
}

async function getBotMove(moves, ownPokemon, enemyPokemon) {
  return await findBestMove(ownPokemon, enemyPokemon);
}

function setupBattle(playerTeam, botTeam) {
  const packedPlayer = Teams.pack(Teams.import(playerTeam));
  const packedBot = Teams.pack(Teams.import(botTeam));

  const battle = new Battle({ formatid: 'gen7customgame' });

  battle.setPlayer(trainerID, { name: 'Trainer', team: packedPlayer });
  battle.setPlayer(botID, { name: 'Wild', team: packedBot });

  battle.choose(trainerID, 'team 1');
  battle.choose(botID, 'team 1');

  return battle;
}

function displayBattleState(battle) {
  console.log('\n--- Turn ' + battle.turn + ' ---');
  const trainerPokemon = battle.p1.active[0];
  const wildPokemon = battle.p2.active[0];

  console.log('\n=== Battle State ===');
  console.log(
    `Your ${trainerPokemon.name} (HP: ${trainerPokemon.hp}/${trainerPokemon.maxhp})`
  );
  console.log(
    `Wild ${wildPokemon.name} (HP: ${wildPokemon.hp}/${wildPokemon.maxhp})`
  );
  console.log('---');

  const lastLogEntry = battle.log[battle.log.length - 1];
  if (lastLogEntry && lastLogEntry.startsWith('|-damage|')) {
    const parts = lastLogEntry.split('|');
    const target = parts[2].split(':')[0];
    const damage = parts[3].split('/')[0];
    console.log(`${target}'s HP reduced to ${damage}`);
  } else if (lastLogEntry && lastLogEntry.startsWith('|-status|')) {
    const parts = lastLogEntry.split('|');
    const target = parts[2].split(':')[0];
    const status = parts[3];
    console.log(`${target} got inflicted with ${status}`);
  } else if (lastLogEntry && lastLogEntry.startsWith('|-fail|')) {
    const parts = lastLogEntry.split('|');
    const pokemon = parts[2].split(':')[0];
    const move = parts[3];
    console.log(`${pokemon}'s ${move} failed!`);
  } else if (lastLogEntry && lastLogEntry.startsWith('|faint|')) {
    const parts = lastLogEntry.split('|');
    const pokemon = parts[2].split(':')[0];
    console.log(`${pokemon} fainted!`);
  }
}

function getAvailableMovesWithDescription(battle, playerId) {
  const player = battle[playerId];
  if (player && player.active[0]) {
    return player.active[0].moveSlots.map((moveSlot, index) => {
      const moveData = Dex.moves.get(moveSlot.move);
      return {
        id: index + 1,
        name: moveSlot.move,
        pp: moveSlot.pp,
        shortDescription: moveData.shortDesc || 'No description available.',
      };
    });
  }
  return [];
}

async function nextMove(battle, playerID) {
  const trainerMoves = getAvailableMovesWithDescription(battle, playerID);
  if (trainerMoves.length > 0 && !battle.ended) {
    let choice = 0;
    if (playerID == trainerID) {
      choice = await getTrainerMove(
        trainerMoves,
        battle.p1.active[0],
        battle.p2.active[0]
      );
    } else {
      choice = await getBotMove(
        trainerMoves,
        battle.p2.active[0],
        battle.p1.active[0]
      );
    }
    battle.choose(playerID, `move ${choice}`);
  }
}

async function fightBotPokemon(playerTeam, botTeam) {
  const battle = setupBattle(playerTeam, botTeam);

  while (!battle.ended) {
    displayBattleState(battle);
    await nextMove(battle, trainerID);
    await nextMove(battle, botID);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.log('\n=== Battle End ===');
  displayBattleState(battle);
  console.log(`Winner: ${battle.winner}`);
}

const trainerTest = `
Clawitzer @ Choice Specs
Ability: Mega Launcher
EVs: 4 Def / 252 SpA / 252 Spe
Modest Nature
- Water Pulse
- Ice Beam
- Dark Pulse
- Aura Sphere
    `;

const botTest = `
Darkrai @ Life Orb
Ability: Bad Dreams
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
- Hypnosis
- Nasty Plot
- Dark Pulse
- Thunder
    `;

fightBotPokemon(trainerTest, botTest);
