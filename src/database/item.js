import connection from './databaseConnection.js';

export async function getAllItemsForUser(userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM item WHERE user = (SELECT name FROM user WHERE discordid = ?)',
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
