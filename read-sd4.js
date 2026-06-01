const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  // Read the raw bytes first
  const rawBytes = fs.readFileSync('workspace/sd.cdb');

  const SQL = await initSqlJs();
  const db = new SQL.Database(rawBytes);

  // Check what sql.js gives us
  const result = db.exec('SELECT id, name, `desc` FROM texts');
  if (result.length > 0) {
    for (const row of result[0].values) {
      const id = row[0];
      const name = row[1]; // sql.js decoded this
      const desc = row[2]; // sql.js decoded this

      console.log(`=== Card ${id} ===`);
      console.log(`Name (sql.js decoded): ${name}`);
      console.log(`Name char codes: ${[...name].map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
      console.log(`Desc (sql.js decoded):\n${desc}`);
    }
  }
  db.close();
})();
