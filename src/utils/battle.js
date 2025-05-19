import showdown from 'pokemon-showdown';
const { Battle, Teams, Dex } = showdown;
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';
import pokeData from '../data/pokemon.json' with { type: 'json' };
import { generateBattleImage, sendUserBattleState } from '../battleRenderer.js';

const trainerID = 'p1';
const botID = 'p2';

export function setupBattle(playerTeam, botTeam) {
  /**
   * This takes two pokepaste sets and generates a battle object of the showdown enginge.
   */
  const packedPlayer = Teams.pack(Teams.import(playerTeam));
  const packedBot = Teams.pack(Teams.import(botTeam));

  const battle = new Battle({ formatid: 'gen7customgame' });

  battle.setPlayer(trainerID, { name: 'Trainer', team: packedPlayer });
  battle.setPlayer(botID, { name: 'Wild', team: packedBot });

  battle.choose(trainerID, 'team 1');
  battle.choose(botID, 'team 1');

  return battle;
}

export async function runBattle(battle, userId, username, wildPokemon, shiny) {
  /**
   * This function is called with a battle object and a userId to run the battle until there is a winner.
   */
  const battleState = await updateBattleState(battle, username, shiny);
  if (!battle.ended) {
    const userResponse = await sendUserBattleState(
      userId,
      battleState,
      wildPokemon
    );
    if (userResponse === null) {
      return;
    }
    battle.choose(trainerID, `move ${userResponse}`);
    await botChooseHighestDamageMove(battle);
    await new Promise((resolve) => setTimeout(resolve, 250));
    await runBattle(battle, userId, username, wildPokemon, shiny);
    return;
  }
  await sendUserBattleState(userId, battleState, wildPokemon);
}

async function updateBattleState(battle, username, shiny) {
  /**
   * This function is used to generate an object containing all usefull data for the user.
   */

  const trainerPokemon = battle.p1.active[0];
  const wildPokemon = battle.p2.active[0];
  const moves = getAvailableMovesWithDescriptionForTrainer(battle);
  const roundLog = generateRoundLog(battle.log);
  const imageName = `src/data/battleImages/${username}.png`;
  console.log('wild species', wildPokemon.species.name);
  console.log('trainer species', trainerPokemon.species.name);
  var wildPokemonSprite =
    pokeData[wildPokemon.species.name.toLowerCase().replace('-meteor', '')]
      .sprite;
  if (shiny) {
    wildPokemonSprite = wildPokemonSprite.replace(
      '/pokemon/',
      '/pokemon/shiny/'
    );
  }
  await generateBattleImage(
    {
      name: trainerPokemon.species.name,
      status: trainerPokemon.status,
      hp: trainerPokemon.hp,
      maxHp: trainerPokemon.maxhp,
      spriteUrl:
        pokeData[
          trainerPokemon.species.name.toLowerCase().replace('-meteor', '')
        ].sprite,
    },
    {
      name: wildPokemon.species.name,
      status: wildPokemon.status,
      hp: wildPokemon.hp,
      maxHp: wildPokemon.maxhp,
      spriteUrl: wildPokemonSprite,
    },
    imageName
  );
  return {
    moves: moves,
    image: imageName,
    roundLog: roundLog,
    winner: battle.winner,
  };
}

function getAvailableMovesWithDescriptionForTrainer(battle) {
  /**
   * This function generates the move data that includes name, id, pp left and a short description for the move.
   */
  const player = battle[trainerID];
  const moves = [];
  if (player && player.active[0]) {
    player.active[0].moveSlots.forEach((moveSlot, index) => {
      const moveData = Dex.moves.get(moveSlot.move);
      if (player.active[0].volatiles.twoturnmove) {
        if (player.active[0].volatiles.twoturnmove.move === moveSlot.id) {
          moves.push({
            id: 1,
            name: moveSlot.move,
            pp: moveSlot.pp,
            shortDescription: moveData.shortDesc || 'No description available.',
          });
        }
      } else if (player.active[0].volatiles.lockedmove) {
        if (player.active[0].volatiles.lockedmove.move === moveSlot.id) {
          moves.push({
            id: 1,
            name: moveSlot.move,
            pp: moveSlot.pp,
            shortDescription: moveData.shortDesc || 'No description available.',
          });
        }
      } else if (player.active[0].volatiles.choicelock) {
        if (player.active[0].volatiles.choicelock.move === moveSlot.id) {
          moves.push({
            id: index + 1,
            name: moveSlot.move,
            pp: moveSlot.pp,
            shortDescription: moveData.shortDesc || 'No description available.',
          });
        }
      } else {
        moves.push({
          id: index + 1,
          name: moveSlot.move,
          pp: moveSlot.pp,
          shortDescription: moveData.shortDesc || 'No description available.',
        });
      }
    });
  }
  return moves;
}

function generateRoundLog(log) {
  const turnIds = [];
  const sortedMoveLog = [];
  let turnNum = 1;

  while (log.includes(`|turn|${turnNum}`)) {
    turnIds.push(log.indexOf(`|turn|${turnNum}`));
    turnNum += 1;
  }

  let moveLog = '';

  if (turnIds.length == 1 && !log[log.length - 1].startsWith('|win|')) {
    return moveLog;
  }

  if (log[log.length - 1].startsWith('|win|')) {
    turnIds.push(log.length);
  }

  let moveStrs = [];

  for (
    let x = turnIds[turnIds.length - 2];
    x < turnIds[turnIds.length - 1];
    x++
  ) {
    if (log[x].startsWith('|turn|')) {
      moveLog += `Turn ${log[x].split('|')[2]}\n`;
    }
    if (log[x].startsWith('|move|')) {
      sortedMoveLog.push(moveStrs);
      moveStrs = [];
    }
    moveStrs.push(log[x]);
  }
  sortedMoveLog.push(moveStrs);
  sortedMoveLog.shift();

  for (const rawMoveLog of sortedMoveLog) {
    moveLog += convertMoveLogToString(rawMoveLog);
  }

  return moveLog;
}

function convertMoveLogToString(log) {
  const trainerNames = {
    p1a: 'Your',
    p2a: 'Wild',
  };
  console.log(log[0].split('|')[4].split(': ')[0]);
  let moveLog = `${trainerNames[log[0].split('|')[2].split(': ')[0]]} ${log[0].split('|')[2].split(': ')[1]} used ${log[0].split('|')[3]} against ${trainerNames[log[0].split('|')[4].split(': ')[0]]} ${log[0].split('|')[4].split(': ')[1]}.\n`;
  if (
    log[0].split('|')[4].split(': ')[0] === '' ||
    log[0].split('|')[4].split(': ')[0] === log[0].split('|')[2].split(': ')[0]
  ) {
    moveLog = `${trainerNames[log[0].split('|')[2].split(': ')[0]]} ${log[0].split('|')[2].split(': ')[1]} used ${log[0].split('|')[3]}.\n`;
  }
  if (log[1].startsWith('|-fail|')) {
    return moveLog + 'Failed.\n';
  }
  if (log[1].startsWith('|-miss|')) {
    return moveLog + 'Missed.\n';
  }
  if (log[1].startsWith('|-prepare|')) {
    return moveLog + 'Preparing...\n';
  }
  if (log[1].startsWith('|-crit|')) {
    moveLog += 'It was a critical hit.\n';
  }
  if (log[1].startsWith('|-boost|')) {
    moveLog += `${trainerNames[log[1].split('|')[2].split(': ')[0]]} ${log[1].split('|')[2].split(': ')[1]} has boosted itself.\n`;
  }
  if (log[1].startsWith('|-supereffective')) {
    moveLog += 'It was super effective.\n';
  }
  if (log[1].startsWith('|-resisted')) {
    moveLog += 'It was not very effective.\n';
  }

  if (log.lenght > 3 && log[log.length - 3].startsWith('|faint|')) {
    moveLog += `${trainerNames[log[log.length - 3].split('|')[2].split(': ')[0]]} ${log[log.length - 3].split('|')[2].split(': ')[1]} fainted.\n`;
  }

  return moveLog;
}

async function botChooseHighestDamageMove(battle) {
  /**
   * This function automatically chooses the highest damaging move for the bot user.
   */
  const attackerShowdown = battle.p2.active[0];
  const defenderShowdown = battle.p1.active[0];
  const gen = Generations.get(attackerShowdown.battle.gen);
  const attacker = formatForCalc(attackerShowdown);
  const defender = formatForCalc(defenderShowdown);
  const moves = attackerShowdown.set.moves;
  let bestMoveIndex = 0;
  let maxDamage = -1;
  if (attackerShowdown.volatiles.twoturnmove) {
    battle.choose(botID, 'move 1');
    return;
  }
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

function formatForCalc(pokemon) {
  /**
   * This function formats a battle engine pokemon to a format valid to be used in the calculator.
   */
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
