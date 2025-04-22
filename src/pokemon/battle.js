import showdown from 'pokemon-showdown';
const { Battle, Teams, Dex } = showdown;

const trainerID = 'p1';
const botID = 'p2';

async function getTrainerMove(moves) {
  console.log(moves);
  return 1;
}

async function getBotMove(moves) {
  console.log(moves);
  return 1;
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
  const p1 = battle.p1.active[0];
  const p2 = battle.p2.active[0];

  console.log('\n=== Battle State ===');
  console.log(`Your ${p1.name} (HP: ${p1.hp}/${p1.maxhp})`);
  console.log(`Wild ${p2.name} (HP: ${p2.hp}/${p2.maxhp})`);
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

async function nextMove(battle, playerID, getChoice) {
  const trainerMoves = getAvailableMovesWithDescription(battle, playerID);
  if (trainerMoves.length > 0 && !battle.ended) {
    const choice = await getChoice(trainerMoves);
    battle.choose(playerID, `move ${choice}`);
  }
}

async function fightBotPokemon(playerTeam, botTeam) {
  const battle = setupBattle(playerTeam, botTeam);

  while (!battle.ended) {
    displayBattleState(battle);
    await nextMove(battle, trainerID, getTrainerMove);
    await nextMove(battle, botID, getBotMove);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n=== Battle End ===');
  displayBattleState(battle);
  console.log(`Winner: ${battle.winner}`);
}

const trainerTest = `
    Charizard @ Charizardite X
    Ability: Blaze
    EVs: 252 Atk / 252 Spe
    Adamant Nature
    - Flamethrower
    - Roost
    - Dragon Claw
    - Earthquake
    `;

const botTest = `
    Charizard @ Charizardite X
    Ability: Blaze
    EVs: 252 Atk / 252 Spe
    Adamant Nature
    - Flamethrower
    - Roost
    - Dragon Claw
    - Earthquake
    `;

fightBotPokemon(trainerTest, botTest);
