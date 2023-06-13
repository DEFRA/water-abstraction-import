'use strict'

const assertImportTablesExist = require('../lib/assert-import-tables-exist')
const importService = require('../../../lib/services/import')

const JOB_NAME = 'nald-import.populate-pending-import'

const createMessage = () => ({
  name: JOB_NAME,
  options: {
    expireIn: '1 hours',
    singletonKey: JOB_NAME
  }
})

const handler = async () => {
  try {
    global.GlobalNotifier.omg('nald-import.populate-pending-import: started')

    await assertImportTablesExist.assertImportTablesExist()
    const licenceNumbers = await importService.getLicenceNumbers()

    return { licenceNumbers }
  } catch (error) {
    global.GlobalNotifier.omfg('nald-import.populate-pending-import: errored', error)
    throw error
  }
}

module.exports = {
  createMessage,
  handler,
  jobName: JOB_NAME
}
