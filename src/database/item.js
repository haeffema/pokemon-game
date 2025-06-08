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

export async function addItemForUser(user, item) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO item (name, user, description, sprite)
      VALUES (?, ?, ?, ?)
    `;

    connection.query(
      query,
      [item.name, user.name, item.description, item.sprite],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(true);
      }
    );
  });
}
