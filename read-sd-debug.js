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

      console.log(`=== Card ${id} ===`);
      console.log(`Name raw bytes: ${Buffer.from(rawName).toString('hex')}`);
      console.log(`Name raw length: ${rawName.length}`);

      // Try different encodings
      const encodings = ['gbk', 'gb2312', 'gb18030', 'utf8', 'latin1', 'cp936'];

      for (const enc of encodings) {
        try {
          const decoded = Buffer.from(rawName).toString(enc);
          console.log(`${enc}: ${decoded}`);
        } catch (e) {
          console.log(`${enc}: ERROR - ${e.message}`);
        }
      }

      console.log(`\nDesc raw bytes (first 100): ${Buffer.from(rawDesc).slice(0,100).toString('hex')}`);
      for (const enc of encodings) {
        try {
          const decoded = Buffer.from(rawDesc).toString(enc);
          console.log(`Desc ${enc}: ${decoded.slice(0, 200)}`);
        } catch (e) {
          console.log(`Desc ${enc}: ERROR - ${e.message}`);
        }
      }
    }
  }
  db.close();
})();
