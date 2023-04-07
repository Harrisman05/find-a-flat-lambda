import { load } from 'cheerio';
import fetch from 'node-fetch'; // for use in Node.js

// getData();

async function getDolphinLivingFlats() {
  try {
    const dolphinUrl = 'https://www.dolphinliving.com/find-a-home/available-homes';
    const hfWestminsterUrl = 'https://www.homesforwestminster.co.uk/category/property-for-rent';

    const dolphinRes = await fetch(dolphinUrl);
    const hfWestminsterRes = await fetch(hfWestminsterUrl);

    const [dolphinData, hfWestminsterData] = await Promise.all([dolphinRes.text(), hfWestminsterRes.text()])

    const allFlats = [];

    $('.views-row').each((i, el) => {
      const flatInfo =         $(el)
      .text()
      .split('\n')
      .map((str) => str.trim())
      .filter(Boolean)
      allFlats.push(flatInfo);

    });

    console.log(allFlats);

  } catch (error) {
    console.error(error);
  }
}

getDolphinLivingFlats();
