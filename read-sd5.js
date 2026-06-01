const fs = require('fs');
const initSqlJs = require('sql.js');
const iconv = require('iconv-lite');

(async () => {
  const SQL = await initSqlJs();
  const rawBytes = fs.readFileSync('workspace/sd.cdb');
  const db = new SQL.Database(rawBytes);

  const result = db.exec('SELECT id, name, `desc`, str1, str2 FROM texts');
  if (result.length > 0) {
    for (const row of result[0].values) {
      const id = row[0];
      const rawName = row[1];
      const rawDesc = row[2];
      const rawStr1 = row[3];
      const rawStr2 = row[4];

      // Convert to buffer
      const nameBuf = Buffer.from(rawName, 'utf16le');
      const descBuf = Buffer.from(rawDesc, 'utf16le');
      const str1Buf = rawStr1 ? Buffer.from(rawStr1, 'utf16le') : null;
      const str2Buf = rawStr2 ? Buffer.from(rawStr2, 'utf16le') : null;

      // Decode as UTF-8
      const name = iconv.decode(nameBuf, 'utf8');
      const desc = iconv.decode(descBuf, 'utf8');
      const str1 = str1Buf ? iconv.decode(str1Buf, 'utf8') : '';
      const str2 = str2Buf ? iconv.decode(str2Buf, 'utf8') : '';

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
