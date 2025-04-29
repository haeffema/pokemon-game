export function generateRandomSet(pokemon) {
  if (pokemon.sets.length == 0) {
    throw 'no sets found';
  }
  const set = pokemon.sets[Math.floor(Math.random() * pokemon.sets.length)];
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
  return `${pokemon.name} @ ${set.item}\nAbility: ${set.ability}\n${evs}\n${set.nature} Nature${moveStr}`;
}