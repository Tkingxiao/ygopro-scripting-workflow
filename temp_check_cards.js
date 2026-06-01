const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

(async () => {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(path.resolve('ygopro/cards.cdb'));
    const db = new SQL.Database(new Uint8Array(buf));
    
    const codes = [16229315, 23995346, 44508094, 33574806, 14558127, 84749824, 73642296, 73580471, 28985331, 5560911, 10000000];
    for (const code of codes) {
        const s2 = db.prepare('SELECT d.id, t.name, d.type, d.attribute, d.race, d.level FROM datas d JOIN texts t ON d.id=t.id WHERE d.id=?');
        s2.bind([code]);
        if (s2.step()) {
            const row = s2.getAsObject();
            console.log(code, JSON.stringify(row));
        } else {
            console.log(code, 'NOT FOUND');
        }
        s2.free();
    }
    
    // Find a fusion with low level (easy to use)
    const stmt = db.prepare("SELECT d.id, t.name, d.type, d.attribute FROM datas d JOIN texts t ON d.id=t.id WHERE (d.type & 64) != 0 LIMIT 5");
    while (stmt.step()) {
        const row = stmt.getAsObject();
        console.log('FUSION:', JSON.stringify(row));
    }
    stmt.free();

    db.close();
})();