import connection from './databaseConnection.js';

export async function getActiveChallenge(username) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM challenges c 
      INNER JOIN users u ON c.user = u.name 
      WHERE u.name = ? AND c.active = 1
    `;
    connection.query(query, [username], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results[0]);
    });
  });
}

export async function updateChallenge(challenge) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE challenges 
      SET user = ?, active = ?, gym = ?, pokepaste = ?, status = ?, replay = ? 
      WHERE id = ?
    `;
    connection.query(
      query,
      [
        challenge.user,
        challenge.active,
        challenge.gym,
        challenge.pokepaste,
        challenge.status,
        challenge.replay,
        challenge.id,
      ],
      (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results.affectedRows > 0);
      }
    );
  });
}
