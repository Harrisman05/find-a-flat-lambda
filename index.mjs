import { load } from 'cheerio';
import fetch from 'node-fetch';
import { DynamoDBClient, PutItemCommand, ScanCommand, TableAlreadyExistsException } from '@aws-sdk/client-dynamodb';
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

    const dolphinFlatsWeb = JSON.stringify({ 'dolphin-flats': parseHTML($dolphin) });
    const westminsterFlatsWeb = JSON.stringify({ 'westminster-flats': parseHTML($hfWestminster) });

    console.log(dolphinFlatsWeb);
    console.log(westminsterFlatsWeb);

    // await createTableEntry(client, tableName, dolphinFlats);
    // await createTableEntry(client, tableName, westminsterFlats);

    const [dolphinFlatsDB, westminsterFlatsDB] = await readTableItems(client, tableName);
    console.log(dolphinFlatsWeb);
    console.log(westminsterFlatsWeb);
    console.log(dolphinFlatsWeb === dolphinFlatsDB);
    console.log(westminsterFlatsWeb === westminsterFlatsDB);

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
      content: { S: flats },
    },
  };
  try {
    await client.send(new PutItemCommand(params));
    console.log(`Item ${id} created in ${tableName}`);
  } catch (err) {
    console.error(`Unable to create item in ${tableName}: ${err}`);
  }
}

async function readTableItems(client, tableName) {
  const params = {
    TableName: tableName,
  };
  try {
    const result = await client.send(new ScanCommand(params));

    const dolphinJSON = result.Items[0].content.S
    const westminsterJSON = result.Items[1].content.S

    console.log(`Read ${result.Items} items from ${tableName}`);
    return [dolphinJSON, westminsterJSON]
  } catch (err) {
    console.error(`Unable to read items from ${tableName}: ${err}`);
    return [];
  }
}

getAvailableFlats();
export { getAvailableFlats };
