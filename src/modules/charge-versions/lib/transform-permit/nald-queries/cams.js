'use strict'

const server = require('../../../../../../server.js')
const db = require('../db')
const sql = require('./sql/cams')
const cache = require('./cache')

const _createCamsCache = () => {
  return cache.createCachedQuery(server, 'getCams', id => {
    const params = [id.code, id.regionCode]
    return db.dbQuery(sql.getCams, params)
  })
}

const _getCamsCache = _createCamsCache()

const getCams = (code, regionCode) => {
  const id = cache.createId('cams', { code, regionCode })
  return _getCamsCache.get(id)
}

module.exports = {
  getCams,
  _getCamsCache,
  _createCamsCache
}
