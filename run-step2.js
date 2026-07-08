const { spawnSync } = require('child_process');
const fs = require('fs');

const sql = fs.readFileSync('step2.sql', 'utf8');

const res = spawnSync('npx', ['supabase', 'db', 'query', sql, '--linked'], { encoding: 'utf8', shell: true });
console.log(res.stdout);
console.error(res.stderr);

const selectSql = `WITH t AS (SELECT COUNT(*) AS tasindi FROM plans WHERE extra_data->>'migrated_from' = 'vaccine_records_v2'), i AS (SELECT COUNT(*) AS isaretlendi FROM vaccine_records_v2 WHERE status = 'migrated_to_plan') SELECT t.tasindi, i.isaretlendi FROM t, i;`;

const res2 = spawnSync('npx', ['supabase', 'db', 'query', selectSql, '--linked'], { encoding: 'utf8', shell: true });
console.log(res2.stdout);
console.error(res2.stderr);
