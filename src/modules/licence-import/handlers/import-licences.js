'use strict'

const extract = require('../extract')

module.exports = async () => {
  try {
    global.GlobalNotifier.omg('import.licences: started')

    const rows = await extract.getAllLicenceNumbers()

    return rows
  } catch (error) {
    global.GlobalNotifier.omfg('import.licences: errored', error)
    throw error
  }
}
