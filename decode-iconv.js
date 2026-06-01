const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const initSqlJs = require('sql.js');

const filePath = path.join(__dirname, 'workspace', '实验.cdb');
console.log('Reading:', filePath);

(async () => {
    const SQL = await initSqlJs();
    const data = fs.readFileSync(filePath);
    const db = new SQL.Database(data);

    const result = db.exec('SELECT id, name, `desc` FROM texts');
    if (result.length > 0 && result[0].values) {
        for (const row of result[0].values) {
            console.log('\n=== ID:', row[0], '===');

            const nameBuf = Buffer.from(row[1], 'binary');
            const descBuf = Buffer.from(row[2], 'binary');

            const nameDecoded = iconv.decode(nameBuf, 'gbk');
            const descDecoded = iconv.decode(descBuf, 'gbk');

            console.log('Name:', nameDecoded);
            console.log('Desc:', descDecoded);
        }
    }

    db.close();
})();