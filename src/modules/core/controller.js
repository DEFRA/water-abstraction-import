const pkg = require('../../../package.json')

const statusResponse = { version: pkg.version }

const getStatus = () => statusResponse

module.exports = {
  getStatus
}
