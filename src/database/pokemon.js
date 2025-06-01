import connection from './databaseConnection.js';

export async function getAllUserPokemon(userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM pokemon WHERE user = (SELECT name FROM user WHERE discordId = ?)',
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

export async function getUserLeadPokemon(userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM pokemon WHERE user = (SELECT name FROM user WHERE discordId = ?) AND lead = 1',
      [userId],
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
      'SELECT * FROM pokemon WHERE user = (SELECT name FROM user WHERE discordid = ?) AND name = ?',
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
      WHERE user = (SELECT name FROM user WHERE discordid = ?)
    `;

    const setQuery = `
      UPDATE pokemon 
      SET lead = 1 
      WHERE name = ? AND user = (SELECT name FROM user WHERE discordid = ?)
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
