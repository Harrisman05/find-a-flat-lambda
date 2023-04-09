import { load } from 'cheerio';
import fetch from 'node-fetch';
import { DynamoDBClient, PutItemCommand, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: 'eu-north-1' });
const tableName = 'westminster_flats_table';

async function getAvailableFlats() {
  try {
    const dolphinID = 'dolphin-flats';
    const westminsterID = 'westminster-flats';

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

    const dolphinFlatsWeb = JSON.stringify({ [dolphinID] : parseHTML($dolphin) });
    const westminsterFlatsWeb = JSON.stringify({ [westminsterID] : parseHTML($hfWestminster) });

    /////////////////////////////////////////////////////////////////////////////////

    await checkEmptyTable(client, tableName, [dolphinFlatsWeb, westminsterFlatsWeb]);

    const dolphinFlatsDB = await readTableItem(client, tableName, dolphinID);
    const westminsterFlatsDB = await readTableItem(client, tableName, westminsterID);
    
    console.log(dolphinFlatsWeb);
    console.log(westminsterFlatsWeb);
    console.log(dolphinFlatsDB);
    console.log(westminsterFlatsDB);
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
  const id = Object.keys(JSON.parse(flats))[0];
  console.log(id);
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

async function readTableItem(client, tableName, id) {
  const params = {
    TableName: tableName,
    Key: {
      "flatID": { S: id }
    }
  };
  try {
    const result = await client.send(new GetItemCommand(params));

    console.log(result.Item.content.S)
    console.log(`Read ${result.Item} items from ${tableName}`);
    return result.Item.content.S;
  } catch (err) {
    console.error(`Unable to read items from ${tableName}: ${err}`);
    return [];
  }
}

async function checkEmptyTable(client, tableName, flats) {
  const [dolphinFlatsWeb, westminsterFlatsWebs] = flats;
  const params = {
    TableName: tableName
  };
  try {
    const result = await client.send(new ScanCommand(params));

    if (result.Items.length === 0) {
      console.log("Table was empty, adding current flat data");
      await createTableEntry(client, tableName, dolphinFlatsWeb);
      await createTableEntry(client, tableName, westminsterFlatsWebs);
    }
  } catch(err) {
    console.error(err);
  }
}

getAvailableFlats();
export { getAvailableFlats };
