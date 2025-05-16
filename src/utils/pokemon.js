import pokemonData from '../data/pokemon.json' with { type: 'json' };
import connection from '../utils/databaseConnection.js';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import showdown from 'pokemon-showdown';
import { StickerPack } from 'discord.js';
const { Teams } = showdown;

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

function extractPokemonName(namePart) {
  const matches = [...namePart.matchAll(/\(([^()]{2,})\)/g)];
  if (matches.length > 0) {
    return matches[matches.length - 1][1].trim();
  } else {
    return namePart
      .trim()
      .replace(/\s*\([^()]*\)/g, '')
      .trim();
  }
}

function formatPokepaste(input) {
  try {
    input.replace(/\s+/g, ' ').trim();
    var angaben = extractFields(input);
    console.log(angaben);
    var [name, rest] = input.split('Ability');
    if (angaben.length == 0) {
      var [ability, rest] = rest.split('EVs');
      ability = 'Ability' + ability;
    }

    if (angaben.length == 1) {
      var [ability, rest] = rest.split(new RegExp(angaben[0] + '(?! \\[)'));
      ability = 'Ability' + ability;
      var [angabe1, rest] = rest.split('EVs');
      angabe1 = angaben[0] + angabe1;
    }
    if (angaben.length == 2) {
      var [ability, rest] = rest.split(angaben[0]);
      ability = 'Ability' + ability;
      var [angabe1, rest] = rest.split(new RegExp(angaben[1] + '(?! \\[)'));
      angabe1 = angaben[0] + angabe1;
      console.log(rest);
      var [angabe2, rest] = rest.split('EVs');
      console.log(rest);
      angabe2 = angaben[1] + angabe2;
    }
    if (angaben.length == 3) {
      var [ability, rest] = rest.split(angaben[0]);
      ability = 'Ability' + ability;
      var [angabe1, rest] = rest.split(angaben[1]);
      angabe1 = angaben[0] + angabe1;
      var [angabe2, rest] = rest.split(new RegExp(angaben[2] + '(?! \\[)'));
      angabe2 = angaben[1] + angabe2;
      var [angabe3, rest] = rest.split('EVs');
      angabe3 = angaben[2] + angabe3;
    }
    if (angaben.length == 4) {
      var [ability, rest] = rest.split(angaben[0]);
      ability = 'Ability' + ability;
      var [angabe1, rest] = rest.split(angaben[1]);
      angabe1 = angaben[0] + angabe1;
      var [angabe2, rest] = rest.split(angaben[2]);
      angabe2 = angaben[1] + angabe2;
      var [angabe3, rest] = rest.split(new RegExp(angaben[3] + '(?! \\[)'));
      angabe3 = angaben[2] + angabe3;
      var [angabe4, rest] = rest.split('EVs');
      angabe4 = angaben[3] + angabe4;
    }
    var [EVs, rest] = splitAtNature(rest);
    EVs = 'EVs' + EVs;

    var [nature, rest] = splitAtFirstDash(rest);
    var moves = splitMovesWithDash(rest);

    var string = name + '\n' + ability;

    if (angabe1 !== undefined) string += '\n' + angabe1;
    if (angabe2 !== undefined) string += '\n' + angabe2;
    if (angabe3 !== undefined) string += '\n' + angabe3;
    if (angabe4 !== undefined) string += '\n' + angabe4;
    if (EVs !== undefined) string += '\n' + EVs;
    if (nature !== undefined) string += '\n' + nature;
    if (moves !== undefined) string += '\n' + moves;
    return string;
  } catch (error) {
    console.error('Parsen des Pokepaste fehlgeschlagen: ' + error);
    return null;
  }
}
function extractFields(input) {
  const fields = ['Level', 'Shiny', 'Happiness', 'Hidden Power'];
  return fields.filter((field) => {
    if (field === 'Hidden Power') {
      return /Hidden Power(?! \[)/.test(input);
    }
    return input.includes(field);
  });
}

function splitAtNature(input) {
  const match = input.match(/\b(\w+)\s+Nature\b/);
  if (!match) return [input]; // Falls keine "Nature" gefunden wird

  const index = match.index;
  const wordBefore = match[1];
  const splitPoint = index + wordBefore.length + ' Nature'.length;

  return [input.slice(0, index).trim(), input.slice(index).trim()];
}
function splitAtFirstDash(input) {
  const index = input.indexOf('-');
  if (index === -1) return [input]; // Kein Dash gefunden

  return [input.slice(0, index).trim(), input.slice(index).trim()];
}

function splitMovesWithDash(input) {
  // Sonderfall: U-turn oder andere Moves mit Bindestrich, die du nicht splitten willst
  const knownMovesWithDash = [
    'U-turn',
    'X-Scissor',
    'Volt-Switch',
    'Double-Edge',
    'Power-Up Punch',
    'Will-O-Wisp',
  ]; // Liste ggf. erweitern

  // Ersetze bekannte Moves mit einem Platzhalter
  const placeholders = {};
  knownMovesWithDash.forEach((move, i) => {
    const placeholder = `__MOVE_${i}__`;
    placeholders[placeholder] = move;
    input = input.replaceAll(move, placeholder);
  });

  // Splitte an Bindestrich, wenn er am Zeilenanfang steht oder nach einem Whitespace kommt
  const moves = input
    .split(/\s*-\s*/) // Entfernt Leerzeichen rund um den Bindestrich
    .map((move) => move.trim())
    .filter((move) => move.length > 0);

  // Ersetze Platzhalter zurück in die echten Moves
  const finalMoves = moves.map((move) => {
    return Object.keys(placeholders).reduce((acc, placeholder) => {
      return acc.replaceAll(placeholder, placeholders[placeholder]);
    }, move);
  });

  // Gib das Ergebnis formatiert zurück
  return finalMoves.map((move) => `- ${move}`).join('\n');
}

export function parsePokepaste(pasteText) {
  var formatText = formatPokepaste(pasteText);
  console.log(formatText);
  if (formatText == null) {
    return null;
  }
  const lines = formatText
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        !line.toLowerCase().startsWith('hidden power') &&
        !line.toLowerCase().startsWith('level')
    )
    .filter(Boolean);

  const pokePasteStringFormat = lines.join('\n');
  const firstLine = lines[0];
  const [namePart, itemPart] = firstLine.split(' @ ');
  var name = namePart.trim();
  name = extractPokemonName(name);
  const item = itemPart ? itemPart.trim() : null;

  let ability = null;
  let shiny = false;
  const moves = [];

  for (const line of lines) {
    if (line.startsWith('Shiny:')) {
      shiny = true;
    }
    if (line.startsWith('Ability:')) {
      ability = line.replace('Ability:', '').trim();
    } else if (line.startsWith('-')) {
      moves.push(line.replace('-', '').trim());
    }
  }

  return { name, item, ability, moves, pokePasteStringFormat, shiny };
}

export async function validateSet(parsedSet, userid) {
  if (parsedSet == null) {
    return {
      success: false,
      message: `Der Pokepaste ist in einem ungültigen Format.`,
    };
  }
  const { name, item, ability, moves, shiny } = parsedSet;
  const pokemon = pokemonData[name.toLowerCase()];
  var currentMoves = [];

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
  } else {
    if (shiny) {
      return {
        success: false,
        message: `Nanana nicht anfangen zu schummeln, dein ${name} ist nicht Shiny ;)`,
      };
    }
    currentMoves = results[0].pokepaste
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => normalizeMove(line.replace('-', '').trim()));
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

  if (itemResults.length === 0 && item != null) {
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
    if (move.startsWith('Hidden Power')) {
      continue;
    }
    const normalizedMove = normalizeMove(move);
    if (!moveKeys.has(normalizedMove)) {
      return {
        success: false,
        message: `${name} cannot learn move "${move}".`,
      };
    }
    const moveData = possibleMoves[normalizedMove];
    if (moveData.type === 'machine' && !currentMoves.includes(moveData.name)) {
      var query = `
            SELECT t.id AS tm_id, t.attacke, ts.Spieler AS besitzt_tm
            FROM tm t 
            LEFT JOIN tm_spieler ts ON t.id = ts.tm AND ts.Spieler = (Select name from spieler where discordid = ?)
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
    } else if (
      moveData.type === 'tutor' &&
      !currentMoves.includes(moveData.name)
    ) {
      var query = `
      SELECT * from tutor where spieler = (Select name from spieler where discordid = ?) and pokemon = ? and attacke = ?;`;
      var tutorResult = await new Promise((resolve, reject) => {
        connection.query(query, [userid, name, move], function (err, results) {
          if (err) {
            reject('Datenbankfehler: ' + err);
          } else {
            resolve(results);
          }
        });
      });
      if (tutorResult.length === 0) {
        return {
          success: false,
          message: `${name} kann den Move "${move}" nur via Tutor erlernen!`,
        };
      }
    }
  }

  return {
    success: true,
    message: `${name} ist zulässig.`,
  };
}

function normalizeMove(move) {
  return move.toLowerCase().replace(/\s+/g, '-');
}

export function generatePokepasteForTrainer(discordId) {
  return new Promise((resolve, reject) => {
    const query =
      'SELECT pokepaste, s.name FROM pokemon p INNER JOIN spieler s ON p.Spieler = s.Name WHERE discordid = ?';
    connection.query(query, [discordId], async (err, collectedPokemon) => {
      if (err) {
        console.error('Database query error:', err);
        return reject(err);
      }

      if (!collectedPokemon || collectedPokemon.length === 0) {
        console.log(`No Pokémon data found for discordId: ${discordId}`);
        return resolve(null);
      }
      try {
        const rawTeamString = collectedPokemon
          .map((p) => (p.pokepaste || '').trim())
          .filter((p) => p.length > 0)
          .join('\n\n');
        if (!rawTeamString) {
          console.error(
            'Error: No valid pokepaste data found after processing DB results.'
          );
          return resolve(null);
        }
        console.log(rawTeamString);
        const formattedTeam = formatPokepasteStringForWebsite(rawTeamString);
        if (!formattedTeam) {
          console.log('Team formatting failed.');
          return resolve(null);
        }
        const pokepasteUrl = await uploadToPokePaste(formattedTeam, {
          title: collectedPokemon[0].name,
          author: 'Orion',
        });
        resolve(pokepasteUrl);
      } catch (processingError) {
        console.error('Error processing data or uploading:', processingError);
        reject(processingError);
      }
    });
  });
}

export function formatPokepasteStringForWebsite(rawTeamString) {
  const teamObject = Teams.import(rawTeamString);
  if (!teamObject || !Array.isArray(teamObject) || teamObject.length === 0) {
    console.error('Error: Failed to import team string using Teams.import().');
    return null;
  }
  let finalTeamString = Teams.export(teamObject);
  return finalTeamString.replace(/\n/g, '\r\n');
}

export async function uploadToPokePaste(teamData, options = {}) {
  const { title = '', author = '' } = options;

  if (!teamData) {
    console.error('Error: teamData cannot be empty.');
    return null;
  }
  teamData = teamData.replace('’', "'");
  const params = new URLSearchParams();
  params.append('paste', teamData.replace(/^\s+|\s+$/g, ''));
  if (title) params.append('title', title);
  if (author) params.append('author', author);

  console.log('Attempting to upload to PokePaste...');

  try {
    const response = await fetch('https://pokepast.es/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      body: params,
      redirect: 'manual',
    });
    if (
      response.status === 302 ||
      response.status === 301 ||
      response.status === 303
    ) {
      const locationHeader = response.headers.get('location');
      if (locationHeader) {
        const newUrl = new URL(locationHeader, 'https://pokepast.es/').href;
        console.log('Successfully uploaded!');
        return newUrl;
      } else {
        console.error(
          'Error: Redirect status received, but Location header is missing.'
        );
        return null;
      }
    } else {
      console.error(
        `Error: Unexpected status code received: ${response.status} ${response.statusText}`
      );
      return null;
    }
  } catch (error) {
    console.error('Error during fetch operation:', error);
    return null;
  }
}
