'use strict'

const createCachedQuery = (server, methodName, generate) => {
  return server.cache({
    segment: methodName,
    expiresIn: 5 * 60 * 1000, // cache for 5 mins
    generateFunc: id => {
      return generate(id)
    },
    generateTimeout: 5000
  })
}

const createId = (key, params) => {
  return {
    id: `${key}:${Object.entries(params).flatMap(num => num).join(':')}`,
    ...params
  }
}
module.exports = {
  createCachedQuery,
  createId
}
