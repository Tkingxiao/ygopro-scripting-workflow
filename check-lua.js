const fs = require('fs');
const path = require('path');

function checkLuaFile(filePath) {
  console.log(`Checking ${filePath}...`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 检查基本格式
  const hasGetID = content.includes('local s,id=GetID()');
  const hasInitialEffect = content.includes('function s.initial_effect(c)');
  
  console.log('  GetID:', hasGetID ? '✓' : '✗');
  console.log('  Initial effect:', hasInitialEffect ? '✓' : '✗');
  
  // 检查括号匹配
  let balance = 0;
  let inString = false;
  let inComment = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];
    
    if (!inString && !inComment) {
      if (char === '(') balance++;
      if (char === ')') balance--;
    }
    
    if (char === '-' && next === '-' && !inString) inComment = true;
    if (char === '\n') inComment = false;
    if (char === '"') inString = !inString;
  }
  
  console.log('  Parenthesis balance:', balance === 0 ? '✓' : '✗');
  
  return hasGetID && hasInitialEffect && balance === 0;
}

// 检查两张卡片
const files = [
  'workspace/script/c11602451.lua',
  'workspace/script/c11602456.lua',
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (checkLuaFile(fullPath)) {
    console.log(`${file}: ✅ OK`);
  } else {
    console.log(`${file}: ❌ Errors`);
  }
  console.log('---');
}