import connection from './databaseConnection.js';

export async function getUnsentMessages() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM messages
      WHERE sent = 0
    `;
    connection.query(query, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

export async function markMessagesAsSent(messageIds) {
  return new Promise((resolve, reject) => {
    if (!messageIds || messageIds.length === 0) {
      return resolve(true);
    }

    const placeholders = messageIds.map(() => '?').join(',');

    const query = `
      UPDATE messages
      SET sent = 1
      WHERE id IN (${placeholders})
    `;

    connection.query(query, messageIds, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results.affectedRows > 0);
    });
  });
}
