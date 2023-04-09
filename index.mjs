import { load } from 'cheerio';
import fetch from 'node-fetch';
import { DynamoDBClient, PutItemCommand, ScanCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
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

    // Create data if table is empty
    await checkEmptyTable(client, tableName, [dolphinFlatsWeb, westminsterFlatsWeb]);

    // If there's data in table, extract each flats data 
    const dolphinFlatsDB = await readTableItem(client, tableName, dolphinID);
    const westminsterFlatsDB = await readTableItem(client, tableName, westminsterID);

    // start check - Check matching, then dolphin, then westminster
    const allFlats = [dolphinFlatsWeb, dolphinFlatsDB, westminsterFlatsWeb, westminsterFlatsDB];
    const allIDs = [dolphinID, westminsterID];
    await checkMatchingData(client, tableName, allIDs, allFlats);

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

async function checkMatchingData(client, tableName, allIDs, allFlats) {
  const [dolphinFlatsWeb, dolphinFlatsDB , westminsterFlatsWeb, westminsterFlatsDB] = allFlats;
  const [dolphinID, westminsterID] = allIDs;

  // If all data matches
  if (dolphinFlatsWeb === dolphinFlatsDB && westminsterFlatsWeb === westminsterFlatsDB) {
    console.log('All data matching, no updates to the website');
    return;
  }

  // If Dolphin web data has been updated
  if (dolphinFlatsWeb !== dolphinFlatsDB) {
    console.log('New listing on Dolphin');
    await updateTableItem(client, tableName, dolphinID, dolphinFlatsWeb);
  }

  // If Westminster web data has been updated
  if (westminsterFlatsWeb !== westminsterFlatsDB) {
    console.log('New listing on Homes for Westminster');
    await updateTableItem(client, tableName, westminsterID, westminsterFlatsWeb);
  }
}

async function updateTableItem(client, tableName, flatID, flatsWeb) {
  const params = {
    TableName: tableName,
    Key: { flatID: { S: flatID } },
    UpdateExpression: 'set content = :json',
    ExpressionAttributeValues: {
      ':json': { S: flatsWeb },
    },
  };

  try {
    const result = await client.send(new UpdateItemCommand(params));
    console.log(`Item ${flatID} updated successfully in ${tableName}`);
  } catch (err) {
    console.error(`Error updating item ${flatID} in ${tableName}: ${err}`);
  }
}

getAvailableFlats();
export { getAvailableFlats };
