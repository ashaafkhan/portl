const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'supabase', 'schema.sql');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/auth\.user_profile\(\)/g, 'public.user_profile()');

fs.writeFileSync(filePath, content);
console.log('Successfully updated schema.sql');
