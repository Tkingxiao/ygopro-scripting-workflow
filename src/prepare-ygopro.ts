import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Preparing ygopro...');

// 这里可以添加下载或准备 ygopro 相关文件的逻辑
// 由于这是示例，我们只是创建目录

const ygoproDir = path.join(__dirname, '..', 'ygopro');

if (!fs.existsSync(ygoproDir)) {
  fs.mkdirSync(ygoproDir, { recursive: true });
  console.log('Created ygopro directory');
}

console.log('prepare:ygopro complete!');
