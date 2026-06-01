const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const data = fs.readFileSync('workspace/sd.cdb');
  const db = new SQL.Database(data);

  const result = db.exec('SELECT id, name, `desc`, str1, str2 FROM texts');
  if (result.length > 0) {
    for (const row of result[0].values) {
      const id = row[0];
      const rawName = row[1];
      const rawDesc = row[2];
      const rawStr1 = row[3];
      const rawStr2 = row[4];

      const name = Buffer.from(rawName).toString('utf8');
      const desc = Buffer.from(rawDesc).toString('utf8');
      const str1 = rawStr1 ? Buffer.from(rawStr1).toString('utf8') : '';
      const str2 = rawStr2 ? Buffer.from(rawStr2).toString('utf8') : '';

      console.log(`=== Card ${id} ===`);
      console.log(`Name: ${name}`);
      console.log(`Str1: ${str1}`);
      console.log(`Str2: ${str2}`);
      console.log(`Desc:\n${desc}`);
      console.log();
    }
  }
  db.close();
})();
