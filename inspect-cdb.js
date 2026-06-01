const fs = require('fs');
const initSqlJs = require('sql.js');
const { YGOProCdb } = require('ygopro-cdb-encode');
(async () => {
  const SQL = await initSqlJs();
  const data = fs.readFileSync('workspace/实验.cdb');
  const db = new SQL.Database(data);
  const cdb = new YGOProCdb(db);
  const ids = [11602451, 11602456];
  for (const id of ids) {
    const c = cdb.findById(id);
    console.log('---', id);
    console.log('name:', c.name);
    console.log('alias:', c.alias);
    console.log('type:', c.type, 'hex', c.type.toString(16));
    console.log('setcode:', c.setcode.toString(16));
    console.log('category:', c.category);
    console.log('race:', c.race);
    console.log('attribute:', c.attribute);
    console.log('level:', c.level);
    console.log('atk:', c.atk, 'def:', c.def);
    console.log('desc:', c.desc.replace(/\n/g, '\\n'));
    console.log('str1', c.str1, 'str2', c.str2, 'str3', c.str3);
  }
  db.close();
})();
