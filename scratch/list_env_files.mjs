import fs from 'fs'

const files = fs.readdirSync('.')
console.log("All files in root:", files)
const envFiles = files.filter(f => f.startsWith('.env'))
console.log("Env files:", envFiles)
envFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8')
  console.log(`Keys in ${f}:`, Object.keys(require('dotenv').parse(content)))
})
