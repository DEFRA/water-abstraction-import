'use strict'

const CleanProcessSteps = require('../clean/process-steps.js')
const CompanyDetailsProcessSteps = require('../company-details/process-steps.js')
const ModLogsProcessSteps = require('../mod-logs/process-steps.js')
const NaldDataProcessSteps = require('../nald-data/process-steps.js')
const PermitProcessSteps = require('../permit/process-steps.js')
const ReturnVersionsProcessSteps = require('../return-versions/process-steps.js')
const LicenceDetailsProcessSteps = require('../licence-details/process-steps.js')
const TrackerProcessSteps = require('../tracker/process-steps.js')

const { calculateAndLogTimeTaken, currentTimeInNanoseconds } = require('../../lib/general.js')

async function go () {
  const allResults = _allResults()

  let emailMessage = 'nightly-import process'

  try {
    global.GlobalNotifier.omg('nightly-import started')

    const startTime = currentTimeInNanoseconds()

    await _naldDataProcess(allResults)
    await _cleanProcess(allResults)
    await _companyDetailsProcess(allResults)
    await _licenceDetailsProcess(allResults)
    await _modLogsProcess(allResults)
    await _returnVersionsProcess(allResults)
    await _permitProcess(allResults)

    const logData = calculateAndLogTimeTaken(startTime, 'nightly-import complete')
    const timeMessage = _timeMessage(logData.timeTakenSs)
    emailMessage = _message(allResults, timeMessage)
  } catch (error) {
    global.GlobalNotifier.omfg('nightly-import errored')
    emailMessage = `Nightly import process errored: ${error.message}`
  }

  await _trackerProcess(emailMessage)
}

function _allResults () {
  return {
    naldData: {
      title: 'NALD data process',
      description: 'Download the NALD zip file, extract the .txt files, then import into DB ready for processing.',
      attempted: false,
      completed: false
    },
    clean: {
      title: 'Clean process',
      description: 'Marks deleted any crm.document_headers, crm_v2.documents with no matching licence in NALD, then hard deletes any return requirements with no match in NALD and no return log in WRLS.',
      attempted: false,
      completed: false
    },
    permit: {
      title: 'Permit process',
      description: 'Imports NALD data as the old versions of the licence: permit.licence and crm.document_header.',
      attempted: false,
      completed: false
    },
    companyDetails: {
      title: 'Company details process',
      description: "Imports NALD 'party' data as companies, contacts and addresses into crm_v2.",
      attempted: false,
      completed: false
    },
    licenceDetails: {
      title: 'Licence details process',
      description: 'Imports NALD licence data as the new version of the licence: water.licence and all child records.',
      attempted: false,
      completed: false
    },
    modLogs: {
      title: 'Mod logs process',
      description: 'Imports NALD mod log data, links it to existing records, and where possible maps NALD reasons to WRLS ones.',
      attempted: false,
      completed: false
    },
    returnVersions: {
      title: 'Return versions process',
      description: 'Imports NALD return version data, then corrects known issues with it, ready for use in WRLS.',
      attempted: false,
      completed: false
    }
  }
}

async function _cleanProcess (allResults) {
  try {
    const { clean, naldData } = allResults

    if (!naldData.completed) {
      return
    }

    clean.attempted = true
    clean.completed = await CleanProcessSteps.go()
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import clean-process failed')
  }
}

async function _companyDetailsProcess (allResults) {
  try {
    const { clean, companyDetails } = allResults

    if (!clean.completed) {
      return
    }

    companyDetails.attempted = true

    const { counts, processComplete } = await CompanyDetailsProcessSteps.go()

    companyDetails.completed = processComplete
    companyDetails.counts = counts
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import company-details process failed')
  }
}

async function _licenceDetailsProcess (allResults) {
  try {
    const { companyDetails, licenceDetails } = allResults

    if (!companyDetails.completed) {
      return
    }

    licenceDetails.attempted = true

    const { counts, processComplete } = await LicenceDetailsProcessSteps.go()

    licenceDetails.completed = processComplete
    licenceDetails.counts = counts
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import licence-details process failed')
  }
}

function _message (allResults, timeMessage) {
  const messages = []

  Object.values(allResults).forEach((result) => {
    const { attempted, completed, description, title } = result
    let message = `${title}\n${description}\nAttempted: ${attempted}\nCompleted: ${completed}`

    if (result.counts) {
      message = `${message} (${result.counts.rejected} of ${result.counts.count} rejected)`
    }

    messages.push(message)
  })

  messages.push(timeMessage)

  return messages.join('\n\n')
}

async function _modLogsProcess (allResults) {
  try {
    const { licenceDetails, modLogs } = allResults

    if (!licenceDetails.completed) {
      return
    }

    modLogs.attempted = true
    modLogs.completed = await ModLogsProcessSteps.go()
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import mod-logs process failed')
  }
}

async function _naldDataProcess (allResults) {
  try {
    const { naldData } = allResults

    naldData.attempted = true
    naldData.completed = await NaldDataProcessSteps.go()
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import nald-data failed')
  }
}

async function _permitProcess (allResults) {
  try {
    const { permit, returnVersions } = allResults

    if (!returnVersions.completed) {
      return
    }

    permit.attempted = true

    const { counts, processComplete } = await PermitProcessSteps.go()

    permit.completed = processComplete
    permit.counts = counts
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import permit process failed')
  }
}

async function _returnVersionsProcess (allResults) {
  try {
    const { modLogs, returnVersions } = allResults

    if (!modLogs.completed) {
      return
    }

    returnVersions.attempted = true
    returnVersions.completed = await ReturnVersionsProcessSteps.go()
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import return-versions process failed')
  }
}

function _timeMessage (secondsAsBigInt) {
  const seconds = Number(secondsAsBigInt)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `Time taken: ${hours} hours, ${minutes} minutes, and ${remainingSeconds} seconds`
}

async function _trackerProcess (emailMessage) {
  try {
    await TrackerProcessSteps.go(emailMessage)
  } catch (error) {
    global.GlobalNotifier.oops('nightly-import tracker process failed')
  }
}

module.exports = {
  go
}
