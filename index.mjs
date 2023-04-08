import { load } from 'cheerio';
import fetch from 'node-fetch';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: 'eu-north-1' });
const tableName = 'westminster_flats_table';

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

    const dolphinFlats = { 'dolphin-flats': parseHTML($dolphin) };
    const westminsterFlats = { 'westminster-flats': parseHTML($hfWestminster) };

    console.log(dolphinFlats);
    console.log(westminsterFlats);

    await createTableEntry(client, tableName, dolphinFlats);
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

async function createTableEntry(client, tableName, flats) {
  const id = uuidv4();
  const params = {
    TableName: tableName,
    Item: {
      flatID: { S: id },
      content: { S: JSON.stringify(flats) },
    },
  };
  try {
    await client.send(new PutItemCommand(params));
    console.log(`Item ${id} created in ${tableName}`);
  } catch (err) {
    console.error(`Unable to create item in ${tableName}: ${err}`);
  }
}
getAvailableFlats();
export { getAvailableFlats };
