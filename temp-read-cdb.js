const fs = require('fs');
const iconv = require('iconv-lite');

const cdbPath = process.argv[2] || 'workspace/火之邦.cdb';

(async () => {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(cdbPath);
  const db = new SQL.Database(new Uint8Array(buf));

  const result = db.exec('SELECT * FROM datas');
  if (result.length > 0 && result[0].values) {
    console.log('=== DATAS ===');
    for (const row of result[0].values) {
      const obj = {};
      result[0].columns.forEach((col, i) => { obj[col] = row[i]; });
      console.log(JSON.stringify(obj));
    }
  }

  const stmt = db.prepare('SELECT * FROM texts');
  const cols = stmt.getColumnNames();

  while (stmt.step()) {
    const row = stmt.get();
    const id = row[0];

    const nameRaw = row[1];
    const descRaw = row[2];

    console.log('\n========== ID:', id, '==========');
    console.log('Name:', iconv.decode(Buffer.from(nameRaw), 'utf-8'));
    console.log('Desc:');
    console.log(iconv.decode(Buffer.from(descRaw), 'utf-8'));

    for (let i = 3; i < cols.length; i++) {
      const val = row[i];
      if (val && val.length > 0) {
        console.log(`${cols[i]}:`, iconv.decode(Buffer.from(val), 'utf-8'));
      }
    }
  }
  stmt.free();
  db.close();
})();
