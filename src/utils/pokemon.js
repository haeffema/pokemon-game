import pokemonData from '../data/pokemon.json' with { type: 'json' };
import connection from '../utils/databaseConnection.js';

export function convertSetToPokepaste(set, name) {
  /**
   * This function converts a random set of a pokemon with the name to a pokepaste set.
   * This does not check if the set or name is undefined, this is done before when the random set is selected.
   */
  let evs = 'EVs:';
  const evConverter = {
    hp: 'HP',
    atk: 'Atk',
    def: 'Def',
    spa: 'SpA',
    spd: 'SpD',
    spe: 'Spe',
  };
  for (let [key, value] of Object.entries(set.evs)) {
    const keyStr = evConverter[key];
    if (key == Object.keys(set.evs)[0]) {
      evs += ` ${value} ${keyStr}`;
    } else {
      evs += ` / ${value} ${keyStr}`;
    }
  }
  let moveStr = '';
  for (let move of set.moves) {
    moveStr += '\n- ' + move;
  }
  return `${name} @ ${set.item}\nAbility: ${set.ability}\n${evs}\n${set.nature} Nature${moveStr}`;
}

export function parsePokepaste(pasteText) {
  const lines = pasteText
    .trim()
    .split('   ')
    .map((line) => line.trim())
    .filter(Boolean);
  const pokePasteStringFormat = lines.join('\n');
  const firstLine = lines[0];
  const [namePart, itemPart] = firstLine.split(' @ ');
  var name = namePart.trim();
  name = name.replace(/\s*\([^()]*\)/g, '').trim();
  const item = itemPart ? itemPart.trim() : null;

  let ability = null;
  const moves = [];

  for (const line of lines) {
    if (line.startsWith('Ability:')) {
      ability = line.replace('Ability:', '').trim();
    } else if (line.startsWith('-')) {
      moves.push(line.replace('-', '').trim());
    }
  }

  return { name, item, ability, moves, pokePasteStringFormat };
}

export async function validateSet(parsedSet, userid) {
  const { name, item, ability, moves } = parsedSet;
  const pokemon = pokemonData[name.toLowerCase()];

  if (!pokemon) {
    return {
      success: false,
      message: `Das Pokemon "${name}" wurde nicht in der Datenbank gefunden.`,
    };
  }

  var query =
    'SELECT * FROM pokemon p INNER JOIN spieler s ON p.Spieler = s.Name WHERE s.discordid = ? AND p.name = ?';
  var results = await new Promise((resolve, reject) => {
    connection.query(query, [userid, name], function (err, results) {
      if (err) {
        reject('Datenbankfehler: ' + err);
      } else {
        resolve(results);
      }
    });
  });

  if (results.length === 0) {
    return {
      success: false,
      message: `Du hast das Pokemon ${name} noch nicht gefangen.`,
    };
  }

  query =
    'SELECT * FROM item i INNER JOIN spieler s ON i.Spieler = s.Name WHERE s.discordid = ? AND i.name = ?';
  var itemResults = await new Promise((resolve, reject) => {
    connection.query(query, [userid, item], function (err, results) {
      if (err) {
        reject('Datenbankfehler: ' + err);
      } else {
        resolve(results);
      }
    });
  });

  if (itemResults.length === 0) {
    return { success: false, message: `Du besitzt das Item "${item}" nicht.` };
  }

  if (!pokemon.abilities.includes(ability)) {
    return {
      success: false,
      message: `Die Fähigkeit "${ability}" ist nicht zulässig für das Pokemon ${name}.`,
    };
  }

  const possibleMoves = pokemon.moves;
  const moveKeys = new Set(Object.keys(possibleMoves));

  for (const move of moves) {
    const normalizedMove = normalizeMove(move);
    if (!moveKeys.has(normalizedMove)) {
      return {
        success: false,
        message: `${name} cannot learn move "${move}".`,
      };
    }
    const moveData = possibleMoves[normalizedMove];
    if (moveData.type === 'machine') {
      var query = `
            SELECT t.id AS tm_id, t.attacke, ts.Spieler AS besitzt_tm
            FROM tm t 
            LEFT JOIN tm_spieler ts ON t.id = ts.tm AND ts.Spieler = (Select name from Spieler where discordid = ?)
            WHERE t.attacke = ?
        `;

      var tmResults = await new Promise((resolve, reject) => {
        connection.query(query, [userid, move], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            console.log(results);
            resolve(results);
          }
        });
      });

      if (tmResults.length === 0) {
        return {
          success: false,
          message: `Der Move "${move}" existiert nicht für dieses Pokemon.`,
        };
      }

      const tm = tmResults[0];
      if (!tm.besitzt_tm) {
        return {
          success: false,
          message: `${name} kann den Move "${move}" nur via ${tm.tm_id} lernen, die du nicht besitzt!.`,
        };
      }
    }
  }

  return {
    success: true,
    message: `${name} mit der Fähigkeit "${ability}" und den angegebenen Moves ist zulässig.`,
  };
}

function normalizeMove(move) {
  return move.toLowerCase().replace(/\s+/g, '-');
}
