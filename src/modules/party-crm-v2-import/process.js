'use strict'

const Addresses = require('./lib/addresses.js')
const Company = require('./lib/company.js')
const CompanyAddresses = require('./lib/company-addresses.js')
const CompanyContact = require('./lib/company-contact.js')
const Extract = require('./lib/extract.js')
const LicenceHolderContact = require('./lib/licence-holder-contact.js')
const Transformer = require('./lib/transformer.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

async function go (party, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()

    const { addresses, licenceRoles, licenceVersions } = await Extract.go(party.FGAC_REGION_CODE, party.ID)

    const transformedPartyData = Transformer.go(party, licenceVersions, licenceRoles, addresses)

    await Company.go(transformedPartyData)
    await Addresses.go(transformedPartyData)
    await LicenceHolderContact.go(transformedPartyData.licenceHolderContact)
    await CompanyContact.go(transformedPartyData)
    await CompanyAddresses.go(transformedPartyData)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'party-crm-v2-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('party-crm-v2-import: errored', { party }, error)

    messages.push(error.message)
  }

  return messages
}

module.exports = {
  go
}
