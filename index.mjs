import { load } from 'cheerio';
import fetch from 'node-fetch';

async function getAvailableFlats() {
  try {
    const dolphinUrl =
      'https://www.dolphinliving.com/find-a-home/available-homes';
    const hfWestminsterUrl =
      'https://www.homesforwestminster.co.uk/category/property-for-rent';

    const dolphinRes = await fetch(dolphinUrl);
    const hfWestminsterRes = await fetch(hfWestminsterUrl);

    const [dolphinBody, hfWestminsterBody] = await Promise.all([
      dolphinRes.text(),
      hfWestminsterRes.text(),
    ]);

    const $dolphin = load(dolphinBody);
    const $hfWestminster = load(hfWestminsterBody);

    const dolphinFlats = {'dolphin-flats' : parseHTML($dolphin)};
    const westminsterFlats = {'westminster-flats' : parseHTML($hfWestminster)};

    console.log(dolphinFlats);
    console.log(westminsterFlats);
  } catch (error) {
    console.error(error);
  }
}

function parseHTML(body) {
  const allFlats = [];

  body('.views-row').each((i, el) => {
    const flatInfo = body(el)
      .text()
      .split('\n')
      .map((str) => str.trim())
      .filter(Boolean);
    allFlats.push(flatInfo);
  });
  return allFlats;
}

export { getAvailableFlats };