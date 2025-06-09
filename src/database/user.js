import connection from './databaseConnection.js';

export async function getAllUsers() {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM users', (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

export async function getUserById(discordId) {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM users WHERE discordId = ?',
      [discordId],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results[0]);
      }
    );
  });
}

export async function updateUser(user) {
  return new Promise((resolve, reject) => {
    connection.query(
      'UPDATE users SET name = ?, badges = ?, money = ?, encounters = ?, newEncounters = ?, sprite = ?, delay = ? WHERE discordId = ?',
      [
        user.name,
        user.badges,
        user.money,
        user.encounters,
        user.newEncounters,
        user.sprite,
        user.delay,
        user.discordId,
      ],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results.affectedRows > 0);
      }
    );
  });
}

export async function dailyReset() {
  for (const user of await getAllUsers()) {
    resetEncounters(user);
    dailyDelayUpdate(user);
    await updateUser(user);
  }
}

function resetEncounters(user) {
  console.log(`Resetting encounters for ${user.name}`);
  user.encounters = 0;
  user.newEncounters = 0;
}

function dailyDelayUpdate(user) {
  console.log(`Updating Delay for ${user.name}`);
  if (user.delay > 0) {
    user.delay -= 1;
  }
}
