import pokemonData from './data/pokemon.json' with { type: 'json' };

const maxNewPokemon = 10;
const maxFights = 35;

const badgeTierPropabilities = {
  0: {
    ZU: 0.1,
    ZUBL: 0.2,
    PU: 0.3,
    PUBL: 0.45,
    NU: 0.6,
    NUBL: 0.7,
    RU: 0.8,
    RUBL: 0.96,
    UU: 0.97,
    UUBL: 0.98,
    OU: 0.99,
    Uber: 1,
  },
  1: {
    ZU: 0.1,
    ZUBL: 0.2,
    PU: 0.3,
    PUBL: 0.4,
    NU: 0.5,
    NUBL: 0.65,
    RU: 0.8,
    RUBL: 0.96,
    UU: 0.97,
    UUBL: 0.98,
    OU: 0.99,
    Uber: 1,
  },
  2: {},
  3: {},
  4: {},
  5: {},
  6: {},
  7: {},
  8: {},
};

function getRandomPokemonForPlayer(userId, activeType) {
  const playerPokemonList = ['bewear', 'venusaur'];

  const badges = 0;
  const catchedToday = 0;

  const newFights = catchedToday < maxNewPokemon;

  const pool = [];

  Object.keys(pokemonData).forEach((pokemon) => {
    if (pokemonData[pokemon].types.includes(activeType)) {
      if (newFights) {
        if (!playerPokemonList.includes(pokemon)) {
          pool.push(pokemonData[pokemon]);
        }
        pool.push(pokemonData[pokemon]);
      } else {
        if (playerPokemonList.includes(pokemon)) {
          pool.push(pokemonData[pokemon]);
        }
      }
    }
  });

  console.log(pool);

  let randomPokemon = undefined;

  while (randomPokemon === undefined) {
    const tier = Object.keys(badgeTierPropabilities[badges]).find((tier) => {
      const probability = badgeTierPropabilities[badges][tier];
      return Math.random() < probability;
    });

    console.log(tier);

    const tierPool = pool.filter((pokemon) => {
      return pokemon.tier === tier;
    });
    if (tierPool.length > 0) {
      randomPokemon = tierPool[Math.floor(Math.random() * tierPool.length)];
    }
  }

  console.log(randomPokemon);
}

getRandomPokemonForPlayer('userId', 'Normal');
