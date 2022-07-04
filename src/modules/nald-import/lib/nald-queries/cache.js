'use strict'

const { logger } = require('../../../../logger')
const { flatMap } = require('lodash')

const createCachedQuery = (server, methodName, generate) => {
  return server.cache({
    segment: methodName,
    expiresIn: 5 * 60 * 1000, // cache for 5 mins
    generateFunc: id => {
      logger.info(`Accessing database for ${methodName}`, id)
      return generate(id)
    },
    generateTimeout: 5000
  })
}

const createId = (key, params) => {
  return {
    id: `${key}:${flatMap(Object.entries(params)).join(':')}`,
    ...params
  }
}

module.exports = {
  createCachedQuery,
  createId
}
