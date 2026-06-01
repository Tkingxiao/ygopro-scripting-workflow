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

      // rawName may be a Uint8Array or Buffer
      const nameBytes = rawName instanceof Uint8Array ? Buffer.from(rawName) : rawName;
      const descBytes = rawDesc instanceof Uint8Array ? Buffer.from(rawDesc) : rawDesc;

      console.log(`=== Card ${id} ===`);
      console.log(`Name type: ${typeof rawName}, isBuffer: ${Buffer.isBuffer(rawName)}, isUint8Array: ${rawName instanceof Uint8Array}`);
      console.log(`Name raw bytes: ${Buffer.from(rawName).toString('hex')}`);
      console.log(`Name utf8: ${Buffer.from(rawName).toString('utf8')}`);
      console.log(`Desc raw bytes: ${Buffer.from(rawDesc).toString('hex').slice(0,200)}`);
      console.log(`Desc utf8:\n${Buffer.from(rawDesc).toString('utf8')}`);
      console.log();
    }
  }
  db.close();
})();
