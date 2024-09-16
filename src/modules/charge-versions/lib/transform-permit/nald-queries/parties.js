'use strict'

const server = require('../../../../../../server.js')
const db = require('../db')
const cache = require('./cache')
const sql = require('./sql/parties')

const _createPartiesCache = () => {
  return cache.createCachedQuery(server, 'getParties', id => {
    return db.dbQuery(sql.getParties, [id.partyId, id.regionCode])
  })
}

const _createPartyContactsCache = () => {
  return cache.createCachedQuery(server, 'getPartyContacts', id => {
    return db.dbQuery(sql.getPartyContacts, [id.partyId, id.regionCode])
  })
}

const _getPartiesCache = _createPartiesCache()
const _getPartyContactsCache = _createPartyContactsCache()

const getParties = async (partyId, regionCode) => {
  const id = cache.createId('parties', { partyId, regionCode })
  return _getPartiesCache.get(id)
}

const getPartyContacts = async (partyId, regionCode) => {
  const id = cache.createId('partyContacts', { partyId, regionCode })
  return _getPartyContactsCache.get(id)
}

const getParty = async (partyId, regionCode) => {
  return db.dbQuery(sql.getParty, [partyId, regionCode])
}

module.exports = {
  _createPartiesCache,
  _createPartyContactsCache,
  _getPartiesCache,
  _getPartyContactsCache,
  getParties,
  getParty,
  getPartyContacts
}
