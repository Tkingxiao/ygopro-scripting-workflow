const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Cdb, CardDataEntry } = require('ygopro-cdb-encode');

async function testCdb() {
  console.log('Testing CDB reading...');
  
  const SQL = await initSqlJs();
  
  // 读取 CDB 文件
  const cdbBuffer = fs.readFileSync(path.join(__dirname, 'workspace', '实验.cdb'));
  
  // 尝试用 YGOPro CDB Encode 读取
  const cdb = new Cdb(SQL);
  cdb.read(cdbBuffer);
  
  console.log('CDB loaded successfully!');
  
  const datas = cdb.getDatas();
  console.log('Datas:', datas);
  
  const texts = cdb.getTexts();
  console.log('Texts:', texts);
}

testCdb();