const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/GEMINI_API_KEY=(.+)/)[1].trim();

fetch(https://generativelanguage.googleapis.com/v1beta/models?key=)
  .then(res => res.json())
  .then(data => {
    const models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
    console.log(models.map(m => m.name).join('\n'));
  })
  .catch(console.error);
