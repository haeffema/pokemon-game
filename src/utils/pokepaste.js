import { JSDOM } from 'jsdom';

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
