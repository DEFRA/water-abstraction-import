'use strict'

const connectors = require('./connectors')

const createPurposeConditionTypes = () => connectors.createPurposeConditionTypes()

module.exports = {
  createPurposeConditionTypes
}
