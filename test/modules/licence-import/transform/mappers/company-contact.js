const { test, experiment } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

const companyContact = require('../../../../../src/modules/licence-import/transform/mappers/company-contact')

const data = require('../data')

const createData = () => {
  const licence = data.createLicence()
  return {
    chargeVersions: data.createChargeVersion(licence),
    licenceVersions: data.createVersion(licence),
    contact: {
      externalId: '1:1000'
    }
  }
}

experiment('modules/licence-import/mappers/company-contact', () => {
  experiment('mapCompanyContacts', () => {
    test('when the contact passed in is null, an empty array is always returned', async () => {
      const { chargeVersions, licenceVersions } = createData()
      const result = companyContact.mapCompanyContacts(null, chargeVersions, licenceVersions)
      expect(result).to.equal([])
    })

    test('when there are no charge versions or licence versions, an empty array is returned', async () => {
      const { contact } = createData()
      const result = companyContact.mapCompanyContacts(contact, [], [])
      expect(result).to.equal([])
    })
  })
})
