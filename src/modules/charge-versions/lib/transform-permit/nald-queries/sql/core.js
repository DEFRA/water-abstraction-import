'use strict'

const importTableExists = `
  select count(*)
  from information_schema.tables
  where table_schema = 'import';
`

module.exports = {
  importTableExists
}
