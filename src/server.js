import express from 'express';
import cors from 'cors';
import { getUserById } from './database/user.js';
import { getAllUserPokemon } from './database/pokemon.js';
import pokemonData from './data/pokemon.json' with { type: 'json' };

const app = express();
const port = 3000;

app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.get('/:userId', async (req, res) => {
  const userId = req.params.userId;
  const user = await getUserById(userId);
  if (!user) {
    return res.status(400).send('invalid user');
  }
  res.send(user);
});

app.get('/pokedex/:userId', async (req, res) => {
  const userId = req.params.userId;
  if (!userId) {
    return res.status(400).send('invalid userid');
  }
  const response = [];
  const userPokemon = await getAllUserPokemon(userId);
  for (const pokeId of Object.keys(pokemonData)) {
    const data = {
      name: pokemonData[pokeId].name,
      caught: false,
      shiny: false,
    };
    for (const userPokeData of userPokemon) {
      if (pokemonData[pokeId].name === userPokeData.name) {
        data.caught = true;
        data.shiny = userPokeData.shiny === 1;
      }
    }
    response.push(data);
  }
  res.send(response);
});

app.get('/bag/:userId', (req, res) => {
  const userId = req.params.userId;
  res.send(`Bag contents for user: ${userId}`);
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
