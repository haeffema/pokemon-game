import showdown from 'pokemon-showdown';
const { Battle, Teams, Dex } = showdown;
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';
// import promptSync from 'prompt-sync';
import { generateBattleImage } from './battleRenderer.js';
import pokeData from './data/pokemon.json' with { type: 'json' };

const trainerID = 'p1';
const botID = 'p2';
// const prompt = promptSync();

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

async function botChooseHighestDamageMove(battle) {
  const attackerShowdown = battle.p2.active[0];
  const defenderShowdown = battle.p1.active[0];
  const gen = Generations.get(attackerShowdown.battle.gen);
  const attacker = formatForCalc(attackerShowdown);
  const defender = formatForCalc(defenderShowdown);
  const moves = attackerShowdown.set.moves;
  let bestMoveIndex = 0;
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
  battle.choose(botID, `move ${bestMoveIndex + 1}`);
}

function getAvailableMovesWithDescriptionForTrainer(battle) {
  const player = battle[trainerID];
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

function extractLastMovesAndDamageFinal(log) {
  const moveData = {};
  const turnIds = [];
  let turnNum = 1;

  while (log.includes(`|turn|${turnNum}`)) {
    turnIds.push(log.indexOf(`|turn|${turnNum}`));
    turnNum += 1;
  }

  if (turnIds.length == 1) {
    return {};
  }

  if (log[log.length - 1].startsWith('|win|')) {
    turnIds.push(log.length);
  }

  for (
    let x = turnIds[turnIds.length - 2];
    x < turnIds[turnIds.length - 1];
    x++
  ) {
    // funktioniert nicht bei oneshot lol
    console.log(log[x]);
  }

  console.log('----------');

  // console.log(log);
  // console.log(turnIds);

  return moveData;
}

function generateBattleState(battle) {
  const trainerPokemon = battle.p1.active[0];
  const wildPokemon = battle.p2.active[0];
  const moves = getAvailableMovesWithDescriptionForTrainer(battle);
  const moveLog = extractLastMovesAndDamageFinal(battle.log);
  return {
    moves: moves,
    trainerPokemon: {
      name: trainerPokemon.name,
      status: trainerPokemon.status,
      hp: trainerPokemon.hp,
      maxHp: trainerPokemon.maxhp,
      spriteUrl: pokeData[trainerPokemon.name.toLowerCase()].sprite,
    },
    wildPokemon: {
      name: wildPokemon.name,
      status: wildPokemon.status,
      hp: wildPokemon.hp,
      maxHp: wildPokemon.maxhp,
      spriteUrl: pokeData[wildPokemon.name.toLowerCase()].sprite,
    },
    moveLog: moveLog,
  };
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

async function nextTrainerMove(battle) {
  // TODO: some async shit that takes the battle state and returns the selected move id
  // const input = prompt('Choose a Move ID (1 - 4) ');
  // const moveID = Number(input);

  const moveID = 1;

  battle.choose(trainerID, `move ${moveID}`);
}

async function fightBotPokemon(playerTeam, botTeam) {
  const battle = setupBattle(playerTeam, botTeam);
  let battleState = generateBattleState(battle);
  await generateBattleImage(
    battleState.trainerPokemon,
    battleState.wildPokemon,
    'src/battleImages/fight_scene_'+ Date.now()+'.png'
  );
  while (!battle.ended) {
    await nextTrainerMove(battle, trainerID);
    await botChooseHighestDamageMove(battle);
    await new Promise((resolve) => setTimeout(resolve, 150));
    battleState = generateBattleState(battle);
    await generateBattleImage(battleState.trainerPokemon, battleState.wildPokemon, 'src/battleImages/fight_scene_'+ Date.now()+'.png');
  }
  console.log(battle.winner == 'Trainer');
  return battle.winner == 'Trainer';
}

const trainerTest = `
Zeraora @ Life Orb
Ability: Volt Absorb
EVs: 252 Atk / 4 SpA / 252 Spe
Naive Nature
- Plasma Fists
- Close Combat
- Grass Knot
- Knock Off
    `;

const botTest = `
Mimikyu @ Life Orb
Ability: Disguise
EVs: 252 Atk / 4 Def / 252 Spe
Adamant Nature
- Swords Dance
- Shadow Claw
- Play Rough
- Shadow Sneak
    `;

fightBotPokemon(trainerTest, botTest);
