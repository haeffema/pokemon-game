import mysql from 'mysql';

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  port: 3306,
  password: null,
  database: 'pokemon',
  multipleStatements: true,
});

connection.connect((err) => {
  if (err) {
    console.log(err.code);
    console.log(err.fatal);
  } else {
    console.log('Connection to Database successful!');
  }
});

export default connection;
