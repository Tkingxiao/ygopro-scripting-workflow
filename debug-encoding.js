const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'workspace', '实验.cdb');
const data = fs.readFileSync(filePath);

console.log('File size:', data.length);
console.log('First 200 bytes (hex):');
console.log(data.slice(0, 200).toString('hex'));

const strTabOffset = data.indexOf(Buffer.from('texts'));
console.log('\nFound "texts" at offset:', strTabOffset);

const initSqlJs = require('sql.js');
(async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database(data);

    const result = db.exec('SELECT name FROM texts LIMIT 1');
    if (result.length > 0) {
        console.log('\nSQL result columns:', result[0].columns);
        console.log('SQL result values:', result[0].values);

        const name = result[0].values[0][0];
        console.log('\nName type:', typeof name);
        console.log('Name length:', name.length);

        const buf = Buffer.from(name, 'utf8');
        console.log('As UTF-8 buffer (hex):', buf.toString('hex'));

        const buf2 = Buffer.from(name, 'binary');
        console.log('As binary buffer (hex):', buf2.toString('hex'));

        const buf3 = Buffer.from(name, 'latin1');
        console.log('As latin1 buffer (hex):', buf3.toString('hex'));
    }

    db.close();
})();