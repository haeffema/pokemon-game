import connection from './databaseConnection.js';

function generatePoolForPlayers() {}

export function updatePoolIfNeeded() {
  const query = `
    SELECT id, tag
    FROM poolTag
    WHERE aktiv = 1;
  `;

  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error('Error querying the database:', error);
      return;
    }

    if (results.length === 0) {
      activatePoolTag(1);
      return;
    }
    results.forEach((row) => {
      const currentDate = new Date();
      if (
        new Date(row.tag) <
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate()
        )
      ) {
        console.log(`Pool tag ${row.id} is outdated. Deactivating...`);
        deactivatePoolTag(row.id);
        let id = row.id + 1;
        while (id > 18) {
          id -= 18;
        }
        activatePoolTag(id);
      }
      console.log(`ID: ${row.id}, Tag: ${row.tag}`);
    });
  });
}

function activatePoolTag(id) {
  const query = `
      UPDATE poolTag
      SET aktiv = 1,
          tag = ?
      WHERE id = ?;
    `;

  const currentDate = new Date().toISOString().split('T')[0];

  connection.query(query, [currentDate, id], (error, results, fields) => {
    if (error) {
      return;
    }
    console.log(`Pool tag ${id} activated with tag set to ${currentDate}.`);
  });
}

function deactivatePoolTag(id) {
  const query = `
    UPDATE poolTag
    SET aktiv = 0
    WHERE id = ?;
  `;
  connection.query(query, [id], (error, results, fields) => {
    if (error) {
      return;
    }
    console.log(`Pool tag ${id} deactivated.`);
  });
}
