import { load } from 'cheerio';
import fetch from 'node-fetch'; // for use in Node.js

async function getDolphinLivingFlats() {
  try {
    const url = 'https://www.dolphinliving.com/find-a-home/available-homes';
    const response = await fetch(url);
    const body = await response.text();
    const $ = load(body);

    const allFlats = [];

    $('.views-row').each((i, el) => {
      const flatInfo = $(el)
        .text()
        .split('\n')
        .map((str) => str.trim())
        .filter(Boolean);
      allFlats.push(flatInfo);
    });

    console.log(allFlats);
  } catch (error) {
    console.error(error);
  }
}

getDolphinLivingFlats();

