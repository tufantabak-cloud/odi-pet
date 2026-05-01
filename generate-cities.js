const fs = require('fs')
const pkg = require('turkey-neighbourhoods')

const cities = pkg.getCities()
const data = cities.map(c => ({
  code: c.code,
  name: c.name,
  districts: pkg.getDistrictsByCityCode(c.code)
}))

// Sort: Istanbul, Ankara, Izmir first, then the rest alphabetically
const top = ['34', '06', '35']
const sorted = [
  ...top.map(code => data.find(d => d.code === code)),
  ...data.filter(d => !top.includes(d.code)).sort((a, b) => a.name.localeCompare(b.name, 'tr'))
]

fs.writeFileSync('./src/lib/cities.json', JSON.stringify(sorted, null, 2))
console.log('done')
