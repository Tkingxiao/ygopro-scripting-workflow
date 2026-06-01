import fs from 'fs';
import initSqlJs from 'sql.js';
import iconv from 'iconv-lite';

async function readCdb(cdbPath: string) {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(cdbPath);
  const db = new SQL.Database(new Uint8Array(buf));

  const result = db.exec('SELECT * FROM datas');
  if (result.length > 0 && result[0].values) {
    console.log('=== DATAS ===');
    console.log('Columns:', result[0].columns);
    for (const row of result[0].values) {
      const obj: Record<string, unknown> = {};
      result[0].columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      console.log(JSON.stringify(obj));
    }
  }

  const stmt = db.prepare('SELECT * FROM texts');
  const cols = stmt.getColumnNames();
  console.log('\n=== TEXTS ===');
  console.log('Columns:', cols);

  while (stmt.step()) {
    const row = stmt.get();
    const id = row[0] as number;

    const nameRaw = row[1] as Uint8Array;
    const descRaw = row[2] as Uint8Array;

    const nameDecoded = iconv.decode(Buffer.from(nameRaw), 'gbk');
    const descDecoded = iconv.decode(Buffer.from(descRaw), 'gbk');

    console.log(`\nID: ${id}`);
    console.log(`Name: ${nameDecoded}`);
    console.log(`Desc: ${descDecoded}`);

    for (let i = 3; i < cols.length; i++) {
      const val = row[i] as Uint8Array;
      if (val && val.length > 0) {
        const decoded = iconv.decode(Buffer.from(val), 'gbk');
        console.log(`  ${cols[i]}: ${decoded}`);
      }
    }
  }
  stmt.free();
  db.close();
}

const cdbPath = process.argv[2] || 'workspace/火之邦.cdb';
readCdb(cdbPath);
