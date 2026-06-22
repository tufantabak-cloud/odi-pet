import { assessWeight } from './src/lib/vetStandards/weightStandards'

console.log("=== Test 1 — İdeal ===")
const t1 = assessWeight({ species: 'cat', breed: 'british_shorthair',
  birthDate: '2023-01-01', weightKg: 4.5,
  isNeutered: true, gender: 'female' })
console.log(t1)

console.log("\n=== Test 2 — Fazla kilolu ===")
const t2 = assessWeight({ species: 'dog', breed: 'golden_retriever',
  birthDate: '2022-01-01', weightKg: 38.5,
  isNeutered: false, gender: 'male' })
console.log(t2)

console.log("\n=== Test 3 — Yavru, ırk bilinmiyor (fallback) ===")
const t3 = assessWeight({ species: 'cat', breed: null,
  birthDate: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  weightKg: 1.2, isNeutered: false, gender: 'unknown' })
console.log(t3)

console.log("\n=== Test 4 — birthDate yok ===")
const t4 = assessWeight({ species: 'dog', breed: 'beagle',
  birthDate: null, weightKg: 10,
  isNeutered: false, gender: 'male' })
console.log(t4)

console.log("\n=== Test 5 — Real Pet (Köpek, Poodle (Kaniş)) ===")
const t5 = assessWeight({ species: 'Köpek', breed: 'Poodle (Kaniş)',
  birthDate: '2022-02-08', weightKg: 4.6,
  isNeutered: false, gender: 'male' })
console.log(t5)

