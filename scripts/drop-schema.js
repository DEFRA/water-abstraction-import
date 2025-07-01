require('dotenv').config()
const { pool } = require('../src/lib/connectors/db')

async function run () {
  const { error } = await pool.query('DROP SCHEMA IF EXISTS "water_import" CASCADE;')
  console.log(error || 'OK')
  process.exit(error ? 1 : 0)
}

run()
