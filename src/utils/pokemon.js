export function convertSetToPokepaste(set, name) {
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
