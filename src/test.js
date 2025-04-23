const pools = [
  ['NUBL', 'RU'],
  ['RUBL', 'UU'],
  ['UUBL', 'OU'],
  ['OUBL', 'UBER'],
];

const poolProps = {
  0: [1, 1, 1, 1],
  1: [0.85, 1, 1, 1],
  2: [0.75, 1, 1, 1],
};

const orden = 2;

const pool = poolProps[orden];

const rn = Math.random();

for (let x = 0; x < pool.length; x++) {
  if (rn <= pool[x]) {
    console.log(pools[x]);
    break;
  }
}
