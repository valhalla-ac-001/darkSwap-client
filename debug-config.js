const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

try {
  const configPath = process.argv[2] || './data/config.yaml';
  console.log('Reading config from:', configPath);
  
  const fileContents = fs.readFileSync(configPath, 'utf8');
  console.log('\n=== Raw File Contents ===');
  console.log(fileContents);
  
  console.log('\n=== Parsing YAML ===');
  const config = yaml.load(fileContents);
  
  console.log('\n=== Parsed Config ===');
  console.log(JSON.stringify(config, null, 2));
  
  console.log('\n=== Validation Check ===');
  console.log('wallets:', config.wallets);
  console.log('chainRpcs:', config.chainRpcs);
  console.log('dbFilePath:', config.dbFilePath);
  console.log('bookNodeSocketUrl:', config.bookNodeSocketUrl);
  console.log('bookNodeApiUrl:', config.bookNodeApiUrl);
  console.log('bookNodeApiKey:', config.bookNodeApiKey);
  
  console.log('\n✅ Config loaded successfully!');
} catch (error) {
  console.error('\n❌ Error loading config:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
