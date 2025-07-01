require('dotenv').config()
const { pool } = require('../src/lib/connectors/db')

async function run () {
  let result = await pool.query('DROP SCHEMA IF EXISTS "water_import" CASCADE;')

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  result = await pool.query('DROP TABLE IF EXISTS public."NALD_RET_LINES" CASCADE;')

  console.log(result.error || 'OK')
  process.exit(result.error ? 1 : 0)
}

run()
