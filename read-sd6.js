const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const rawBytes = fs.readFileSync('workspace/sd.cdb');
  const db = new SQL.Database(rawBytes);

  // Use a binary query to get raw bytes
  const result = db.exec("SELECT hex(id), hex(name), hex(`desc`) FROM texts");
  if (result.length > 0) {
    for (const row of result[0].values) {
      const idHex = row[0];
      const nameHex = row[1];
      const descHex = row[2];

      console.log(`=== Card ID: ${parseInt(idHex, 16)} ===`);
      console.log(`Name hex: ${nameHex}`);

      // Try different decodings on the hex bytes
      const nameBytes = Buffer.from(nameHex, 'hex');
      console.log(`Name as UTF-8: ${nameBytes.toString('utf8')}`);
      console.log(`Name as GBK: ${nameBytes.toString('latin1')}`);

      console.log(`\nDesc hex (first 200 chars): ${descHex.slice(0, 200)}`);
      const descBytes = Buffer.from(descHex.slice(0, 200), 'hex');
      console.log(`Desc as UTF-8:\n${descBytes.toString('utf8')}`);
      console.log();
    }
  }
  db.close();
})();
