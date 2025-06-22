import connection from './databaseConnection.js';

export async function getAllItemsForUser(userId) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM items WHERE user = (SELECT name FROM users WHERE discordid = ?)',
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
      INSERT INTO items (name, user, description, sprite)
      VALUES (?, ?, ?, ?)
    `;

    connection.query(
      query,
      [item.name, user.name, item.description, item.sprite],
      (error) => {
        if (error) {
          return reject(error);
        }
        resolve(true);
      }
    );
  });
}

export async function userHasItem(userId, itemName) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT COUNT(*) AS count FROM items WHERE user = (SELECT name FROM users WHERE discordid = ?) AND name = ?',
      [userId, itemName],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results[0].count > 0);
      }
    );
  });
}
