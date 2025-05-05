import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import connection from './utils/databaseConnection.js';
import showdown from 'pokemon-showdown';
const { Teams } = showdown;

const POKEPASTE_UPLOAD_URL = 'https://pokepast.es/create';

async function uploadToPokePaste(teamData, options = {}) {
  const { title = '', author = '' } = options;

  if (!teamData) {
    console.error('Error: teamData cannot be empty.');
    return null;
  }
  const params = new URLSearchParams();
  params.append('paste', teamData.replace(/^\s+|\s+$/g, ''));
  if (title) params.append('title', title);
  if (author) params.append('author', author);

  console.log('Attempting to upload to PokePaste...');

  try {
    const response = await fetch(POKEPASTE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      body: params,
      redirect: 'manual',
    });
    if (
      response.status === 302 ||
      response.status === 301 ||
      response.status === 303
    ) {
      const locationHeader = response.headers.get('location');
      if (locationHeader) {
        const newUrl = new URL(locationHeader, 'https://pokepast.es/').href;
        console.log('Successfully uploaded!');
        return newUrl;
      } else {
        console.error(
          'Error: Redirect status received, but Location header is missing.'
        );
        return null;
      }
    } else {
      console.error(
        `Error: Unexpected status code received: ${response.status} ${response.statusText}`
      );
      return null;
    }
  } catch (error) {
    console.error('Error during fetch operation:', error);
    return null;
  }
}

const query =
  'Select pokepaste, s.name from pokemon p inner join spieler s on p.Spieler = s.Name where discordid = ?';
connection.query(
  query,
  ['326305842427330560'],
  async function (err, collectedPokemon) {
    let pokepaste = '';
    for (const pokemon of collectedPokemon) {
      pokepaste += `${pokemon.pokepaste}\n\n`;
    }
    const team = Teams.import(pokepaste);
    let formattedTeam = '';
    for (const pokemon of team) {
      formattedTeam += `${Teams.exportSet(pokemon)}\n`;
    }
    formattedTeam = formattedTeam.substring(0, formattedTeam.length - 1);
    formattedTeam = formattedTeam.replace(/\n/g, '\r\n');
    uploadToPokePaste(formattedTeam, {
      title: collectedPokemon[0].name,
      author: 'Orion',
    }).then((url) => {
      if (url) {
        console.log(`\nPokePaste URL: ${url}\n`);
      } else {
        console.log('\nFailed to upload team and get URL.\n');
      }
    });
  }
);
