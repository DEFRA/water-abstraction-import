'use strict'

async function importJob (_request, h) {
  return h.response().code(204)
}

module.exports = {
  importJob
}
