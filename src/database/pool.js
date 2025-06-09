import connection from './databaseConnection.js';
import { sendMessage } from '../utils/sendMessage.js';

export async function getAllPools() {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM pools', (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

export async function getAllAvailablePools() {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM pools WHERE pools.wasActive = 0',
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      }
    );
  });
}

export async function getActivePool() {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM pools WHERE pools.active = 1',
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results[0]);
      }
    );
  });
}

export async function updatePool(pool) {
  return new Promise((resolve, reject) => {
    connection.query(
      'UPDATE pools SET type = ?, active = ?, wasActive = ?, message = ? WHERE id = ?',
      [pool.type, pool.active, pool.wasActive, pool.message, pool.id],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results.affectedRows > 0);
      }
    );
  });
}

export async function setNewPool() {
  const availablePools = await getAllAvailablePools();
  if (availablePools.length === 0) {
    const pools = await getAllPools();
    for (const pool of pools) {
      pool.wasActive = 0;
      await updatePool(pool);
    }
    await setNewPool();
    return;
  }
  const activePool = await getActivePool();
  activePool.active = 0;
  await updatePool(activePool);
  const newPool =
    availablePools[Math.floor(Math.random() * availablePools.length)];
  newPool.active = 1;
  newPool.wasActive = 1;
  await updatePool(newPool);
  await sendMessage({
    title: 'Täglicher Bericht des Professors',
    description: newPool.message,
    color: 'Yellow',
  });
}
