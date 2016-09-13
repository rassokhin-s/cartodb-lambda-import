var CartoDB = require('cartodb'),
    fs = require("fs");

if (fs.existsSync("./config/env_vars.js")) {
  var env = require("./config/env_vars.js").env;
}
else {
  console.error("Config file doesn't exist. Exiting");
  return;
}

var sql = new CartoDB.SQL({
  user: env.CARTODB_USER,
  api_key: env.CARTODB_KEY
});

var jsonData = {
  events: [
    {
      event_guid: "533b11fe-7d25-4b17-a588-198bf7652812",
      audio_guid: "222",
      latitude: -10.73100000,
      longitude: -60.91600000,
      begins_at: "2015-09-02T02:30:00Z",
      ends_at: "2015-09-02T02:31:30Z",
      type: "alertt",
      name: "chainsaww",
      confidence: 0.9
    },
    {
      event_guid: "5e9d49d1-5a9c-4682-8d58-978854f6bd99",
      audio_guid: "a7e4c42d-4862-4fdc-b5f1-8f69d1cb3441",
      latitude: -15.17400000,
      longitude: -63.96100000,
      begins_at: "2016-09-02T02:35:31Z",
      ends_at: "2016-09-02T02:41:36Z",
      type: "alert",
      name: "chainsaw",
      confidence: 0.43
    },
    {
      event_guid: "5e9d49d1-5a9c-4682-8d58-978854f6bd88",
      audio_guid: "a7e4c42d-4862-4fdc-b5f1-8f69d1cb3441",
      latitude: -14.17400000,
      longitude: -64.96100000,
      begins_at: "2016-09-02T02:35:31Z",
      ends_at: "2016-09-02T02:41:36Z",
      type: "alert",
      name: "chainsaw",
      confidence: 0.22
    }
  ]
};

/**
 * Creates query for importing data
 * @returns {string} - sql query string
 */
function combineQuery() {
  var sql = 'WITH n(event_guid, audio_guid, latitude, longitude, begins_at, ends_at, type, name, confidence, the_geom) AS (VALUES ';

  for (var i = 0; i < jsonData.events.length; i++) {
    var json = jsonData.events[i];
    sql += "(" +
      "'" + json.event_guid +  "', " +
      "'" + json.audio_guid + "', " +
            json.latitude + ", " +
            json.longitude + ", " +
      "to_timestamp('" + json.begins_at + "', 'YYYY-MM-DD HH24:MI:SS'), " +
      "to_timestamp('" + json.ends_at + "', 'YYYY-MM-DD HH24:MI:SS'), '" +
            json.type + "', " +
      "'" + json.name + "', " +
            json.confidence + ", " +
      "ST_SetSRID(ST_Point(" + json.longitude + "," + json.latitude + "),4326))";
    if (i !== jsonData.events.length-1) {
      sql += ', '
    }
    else {
      sql += '), '
    }
  }
  // update existing rows
  sql += ' upsert AS ( UPDATE ' + env.CARTODB_TABLE + ' o SET audio_guid=n.audio_guid, latitude=n.latitude, longitude=n.longitude, begins_at=n.begins_at, ends_at=n.ends_at, type=n.type, name=n.name, confidence=n.confidence, the_geom=n.the_geom FROM n WHERE o.event_guid = n.event_guid RETURNING o.event_guid )';
  // insert missing rows
  sql += ' INSERT INTO ' + env.CARTODB_TABLE + ' (event_guid, audio_guid, latitude, longitude, begins_at, ends_at, type, name, confidence, the_geom) SELECT n.event_guid, n.audio_guid, n.latitude, n.longitude, n.begins_at, n.ends_at, n.type, n.name, n.confidence, n.the_geom FROM n WHERE n.event_guid NOT IN ( SELECT event_guid FROM upsert );';

  return sql;
}

/**
 * Creates table with name from config
 * @returns {object} Custom promise object
 */
function createTable() {
  console.log('Executing table creation');
  var tableName = env.CARTODB_TABLE,
      query = "CREATE TABLE " + tableName + " (cartodb_id integer, the_geom geometry, audio_guid text, begins_at date, confidence float, ends_at date, event_guid text, latitude float, longitude float, name text, type text); SELECT cdb_cartodbfytable('" + tableName + "');";
  return sql.execute(query)
    .done(function(data) {
      console.log('Table creation finished successfully:', data);
    })
    .error(function (err) {
      console.log('Error in process of table creation', err);
    });
}

/**
 * Imports data into Cartodb table
 */
function executeImport() {
  console.log('Executing import');
  var query = combineQuery();
  sql.execute(query)
    .done(function(data) {
      console.log('Import finished successfully:', data);
    })
    .error(function (err) {
      console.log('Error in process of import', err);
    });
}

console.log('Checking if table', env.CARTODB_TABLE, 'exists');
sql.execute("SELECT to_regclass('" + env.CARTODB_TABLE + "');")
  .done(function(data) {
    if (data.rows[0].to_regclass === null) {
      console.log('Table doesn\'t exist.');
      createTable()
        .done(function() {
          executeImport();
        });
    }
    else {
      console.log('Table exists.');
      executeImport();
    }
  })
  .error(function(err) {
    console.log('Table check error. Exiting.', err);
  });
