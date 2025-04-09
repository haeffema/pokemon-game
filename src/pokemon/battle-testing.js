import showdown from 'pokemon-showdown';
const { BattleStream, getPlayerStreams } = showdown;

// Simple AI for choosing moves
function chooseMove(battle) {
  const pokemon = battle.getActivePokemon();
  if (pokemon && pokemon.moves.length > 0) {
    const moveIndex = Math.floor(Math.random() * pokemon.moves.length) + 1;
    return `move ${moveIndex}`;
  } 
  return 'pass'; // If no moves available, pass the turn
}

// Function to simulate a battle
async function battle() {
  try {
    const battleStream = new BattleStream();
    const { p1, p2 } = getPlayerStreams(battleStream);

    battleStream.write(`>start {"formatid":"gen9randombattle"}`);

    // Send teams (random battle so empty teams)
    p1.write(`>player p1 {"name":"Trainer 1"}`);
    p2.write(`>player p2 {"name":"Trainer 2"}`);

    let battleOver = false;
    let turn = 0;

    for await (const chunk of battleStream) {
      const battleText = chunk.toString();
      console.log(battleText);

      if (battleText.includes('|win|')) {
        battleOver = true;
        break; // End battle when a winner is announced
      }

      if (battleText.includes('|request|')) {
        const request = JSON.parse(battleText.split('|request|')[1]);

        if (request.active) {
          const player = request.side.id;
          const battleInfo = {
            getActivePokemon: () => request.active[0],
          };
          const chosenMove = chooseMove(battleInfo);

          if (player === 'p1') {
            p1.write(`>${chosenMove}`);
          } else if (player === 'p2') {
            p2.write(`>${chosenMove}`);
          }
        }
      }

      if (battleText.startsWith('|turn|')) {
        turn = parseInt(battleText.split('|turn|')[1]);
      }
    }
    console.log(`Battle finished after ${turn} turns.`);
  } catch (error) {
    console.error("Error during battle simulation:", error);
  }
}

battle();
