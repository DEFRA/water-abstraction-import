'use strict'

const purposeConditionsConnector = require('../connectors/purpose-conditions-types')

module.exports = async () => {
  try {
    global.GlobalNotifier.omg('import.purpose-condition-types: started')

    return purposeConditionsConnector.createPurposeConditionTypes()
  } catch (error) {
    global.GlobalNotifier.omfg('import.purpose-condition-types: errored', error)
    throw error
  }
}
