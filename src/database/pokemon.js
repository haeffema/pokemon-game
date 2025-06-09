import connection from './databaseConnection.js';

export async function getAllUserPokemon(userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM pokemon WHERE user = (SELECT name FROM users WHERE discordId = ?)',
      [userId],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      }
    );
  });
}

export async function getUserLeadPokemon(username) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM pokemon WHERE user = ? AND lead = 1',
      [username],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results[0]);
      }
    );
  });
}

export async function checkIfUserHasPokemon(userId, pokemonName) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM pokemon WHERE user = (SELECT name FROM users WHERE discordid = ?) AND name = ?',
      [userId, pokemonName],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results.length > 0);
      }
    );
  });
}

export async function setPokemonAsLead(userId, pokemonName) {
  return new Promise((resolve, reject) => {
    const resetQuery = `
      UPDATE pokemon 
      SET lead = 0 
      WHERE user = (SELECT name FROM users WHERE discordid = ?)
    `;

    const setQuery = `
      UPDATE pokemon 
      SET lead = 1 
      WHERE name = ? AND user = (SELECT name FROM users WHERE discordid = ?)
    `;

    connection.query(resetQuery, [userId], (err) => {
      if (err) return reject(err);

      connection.query(setQuery, [pokemonName, userId], (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  });
}

export async function makeUserPokemonShiny(userId, pokemonName) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE pokemon
      SET shiny = 1
      WHERE name = ? AND user = (SELECT name FROM users WHERE discordId = ?)
    `;
    connection.query(query, [pokemonName, userId], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results.affectedRows > 0);
    });
  });
}

export async function setPokemonPokepaste(userId, pokemonName, pokepasteData) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE pokemon
      SET pokepaste = ?
      WHERE name = ? AND user = (SELECT name FROM users WHERE discordId = ?)
    `;
    connection.query(
      query,
      [pokepasteData, pokemonName, userId],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results.affectedRows > 0);
      }
    );
  });
}

export async function addNewPokemonForUser(user, pokemonData) {
  return new Promise((resolve, reject) => {
    const query = `
        INSERT INTO pokemon (name, user, pokepaste, lead, shiny)
        VALUES (?, ?, ?, ?, ?)
      `;
    connection.query(
      query,
      [
        pokemonData.name,
        user.name,
        pokemonData.pokepaste,
        pokemonData.lead,
        pokemonData.shiny,
      ],
      (error, results) => {
        if (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            return reject(
              new Error(
                `Pokémon '${pokemonData.name}' already exists for this user.`
              )
            );
          }
          return reject(error);
        }
        resolve(results.affectedRows > 0);
      }
    );
  });
}
