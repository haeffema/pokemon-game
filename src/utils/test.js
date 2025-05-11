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
      var [ability, rest] = rest.split(angaben[0]);
      ability = 'Ability' + ability;
      var [angabe1, rest] = rest.split('EVs');
      angabe1 = angaben[0] + angabe1;
    }
    if (angaben.length == 2) {
      var [ability, rest] = rest.split(angaben[0]);
      ability = 'Ability' + ability;
      var [angabe1, rest] = rest.split(angaben[1]);
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
      var [angabe2, rest] = rest.split(angaben[2]);
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
      var [angabe3, rest] = rest.split(angaben[3]);
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
    return null;
  }
}
function extractFields(input) {
  const fields = ['Level', 'Shiny', 'Happiness', 'Hidden Power'];
  return fields.filter((field) => input.includes(field));
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
  const knownMovesWithDash = ['U-turn', 'X-Scissor', 'Volt-Switch']; // Liste ggf. erweitern

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

var pasteText = `Zoroark @ Choice Specs   
EVs: 252 SpA / 4 SpD / 252 Spe  
Timid Nature  
- Flamethrower  
- Dark Pulse  
- Sludge Bomb  
- U-turn`;
var formatText = formatPokepaste(pasteText);
console.log(formatText);
if (formatText == null) {
  console.log('Ungültiger Pokepaste');
} else {
  const linesTest = formatText
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        !line.toLowerCase().startsWith('hidden power') &&
        !line.toLowerCase().startsWith('level')
    )
    .filter(Boolean);
  console.log(linesTest);
}
