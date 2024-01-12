'use strict'

const fs = require('fs')
const path = require('path')
let Promise

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
function setup (options, _seedLink) {
  Promise = options.Promise
}

function up (db) {
  const filePath = path.join(__dirname, 'sqls', '20191115135544-uuid-types-up.sql')
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
      if (err) return reject(err)

      resolve(data)
    })
  })
    .then(function (data) {
      return db.runSql(data)
    })
}

function down (db) {
  const filePath = path.join(__dirname, 'sqls', '20191115135544-uuid-types-down.sql')
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
      if (err) return reject(err)

      resolve(data)
    })
  })
    .then(function (data) {
      return db.runSql(data)
    })
}

const _meta = {
  version: 1
}

module.exports = {
  setup,
  up,
  down,
  _meta
}
