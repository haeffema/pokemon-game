import connection from './databaseConnection.js';

export async function addTmForUser(userId, tmId) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO tms (user, tm)
      VALUES ((SELECT name FROM users WHERE discordId = ?), ?)
    `;
    connection.query(query, [userId, tmId], (error, results) => {
      if (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          return reject(new Error(`User already has TM: ${tmId}`));
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          return reject(
            new Error(
              `User with discordId '${userId}' not found for adding TM.`
            )
          );
        }
        return reject(error);
      }
      resolve(results.affectedRows > 0);
    });
  });
}

export async function getAllTmsForUser(userId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT tm FROM tms WHERE user = (SELECT name FROM users WHERE discordId = ?)
    `;
    connection.query(query, [userId], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}
