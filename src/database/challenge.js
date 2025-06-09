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

export async function addChallenge(challengeData) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO challenges (user, active, gym, pokepaste)
      VALUES (?, 1, ?, ?)
    `;
    connection.query(
      query,
      [challengeData.user, challengeData.gym, challengeData.pokepaste],
      (err, results) => {
        if (err) {
          if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return reject(
              new Error(
                `User '${challengeData.user}' does not exist in the database.`
              )
            );
          }
          return reject(err);
        }
        resolve(results.insertId);
      }
    );
  });
}
