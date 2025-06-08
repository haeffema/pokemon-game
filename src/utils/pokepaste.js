import { JSDOM } from 'jsdom';
import showdown from 'pokemon-showdown';
import { getUserById } from '../database/user.js';
import { getAllUserPokemon } from '../database/pokemon.js';

export async function getPokepasteTeamFromHtml(pokepasteUrl) {
  try {
    const response = await fetch(pokepasteUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const htmlText = await response.text();

    let teamString = '';

    if (
      typeof window !== 'undefined' &&
      typeof window.DOMParser !== 'undefined'
    ) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const preElements = doc.querySelectorAll('pre');

      preElements.forEach((pre) => {
        teamString += pre.textContent.trim() + '\n\n';
      });
    } else if (typeof JSDOM !== 'undefined') {
      const dom = new JSDOM(htmlText);
      const document = dom.window.document;
      const preElements = document.querySelectorAll('pre');

      preElements.forEach((pre) => {
        teamString += pre.textContent.trim() + '\n\n';
      });
    } else {
      throw new Error(
        'Neither DOMParser nor JSDOM is available. Cannot parse HTML.'
      );
    }

    return teamString.trim();
  } catch (error) {
    console.error('Error fetching or parsing Pokepaste team:', error);
    return null;
  }
}

export async function generatePokepasteForTrainer(userId) {
  const user = await getUserById(userId);
  const userPokemon = await getAllUserPokemon(userId);

  const rawTeamString = userPokemon
    .map((p) => (p.pokepaste || '').trim())
    .filter((p) => p.length > 0)
    .join('\n\n');

  const formattedTeam = formatPokepasteStringForWebsite(rawTeamString);

  return await uploadToPokePaste(formattedTeam, {
    title: user.name,
    author: 'Orion',
  });
}

function formatPokepasteStringForWebsite(rawTeamString) {
  const teamObject = showdown.Teams.import(rawTeamString);
  if (!teamObject || !Array.isArray(teamObject) || teamObject.length === 0) {
    console.error('Error: Failed to import team string using Teams.import().');
    return null;
  }
  let finalTeamString = showdown.Teams.export(teamObject);
  return finalTeamString.replace(/\n/g, '\r\n');
}

async function uploadToPokePaste(teamData, options = {}) {
  const { title = '', author = '' } = options;

  if (!teamData) {
    console.error('Error: teamData cannot be empty.');
    return null;
  }
  teamData = teamData.replace('’', "'");
  const params = new URLSearchParams();
  params.append('paste', teamData.replace(/^\s+|\s+$/g, ''));
  if (title) params.append('title', title);
  if (author) params.append('author', author);

  console.log('Attempting to upload to PokePaste...');

  try {
    const response = await fetch('https://pokepast.es/create', {
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
