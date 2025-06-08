import connection from './databaseConnection.js';

export async function checkIfTutorMoveIsLearned(userId, pokemonName, move) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM tutorMoves
      WHERE user = (SELECT name FROM users WHERE discordId = ?)
      AND pokemon = ?
      AND move = ?
    `;
    connection.query(query, [userId, pokemonName, move], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results.length > 0);
    });
  });
}

export async function addTutorMove(userId, pokemonName, move) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO tutorMoves (user, pokemon, move)
      VALUES ((SELECT name FROM users WHERE discordId = ?), ?, ?)
    `;
    connection.query(query, [userId, pokemonName, move], (error, results) => {
      if (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          return reject(
            new Error(
              `User '${userId}' already has '${move}' learned for '${pokemonName}'.`
            )
          );
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          return reject(
            new Error(
              `User with discordId '${userId}' or Pokemon '${pokemonName}' not found or invalid.`
            )
          );
        }
        return reject(error);
      }
      resolve(results.affectedRows > 0);
    });
  });
}
