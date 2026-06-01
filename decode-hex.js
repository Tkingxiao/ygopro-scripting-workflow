const fs = require('fs');
const initSqlJs = require('sql.js');

const GBK_TABLE = require('./node_modules/sql.js/dist/sql-wasm.js');

function decodeGBK(buffer) {
  const result = [];
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte >= 0x81 && byte <= 0xFE) {
      if (i + 1 < buffer.length) {
        const byte2 = buffer[i + 1];
        if ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFE)) {
          result.push(`[GBK:${byte.toString(16)}${byte2.toString(16)}]`);
          i++;
          continue;
        }
      }
    }
    if (byte < 0x80) {
      result.push(String.fromCharCode(byte));
    } else {
      result.push(`[${byte.toString(16)}]`);
    }
  }
  return result.join('');
}

(async () => {
  const SQL = await initSqlJs();
  const data = fs.readFileSync('workspace/幻想乡梦游电子界.cdb');
  const db = new SQL.Database(data);
  
  const result = db.exec('SELECT id, name, desc FROM texts');
  const vals = result[0].values;
  
  for (const row of vals) {
    console.log('ID:', row[0]);
    const nameBuf = Buffer.from(row[1], 'binary');
    const descBuf = Buffer.from(row[2], 'binary');
    console.log('Name bytes:', nameBuf.toString('hex'));
    console.log('Desc bytes:', descBuf.toString('hex').substring(0, 200));
    console.log('---');
  }
  
  db.close();
})();