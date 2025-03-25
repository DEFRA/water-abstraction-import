'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const { experiment, test, beforeEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const moment = require('moment')
const PermitDataFixture = require('../../../support/permit-data.fixture.js')

// Thing under test
const Transformer = require('../../../../src/modules/party-crm-v2-import/lib/transformer.js')

experiment('modules/party-crm-v2-import/lib/transformer.js', () => {
  let licence
  let licenceRoles
  let licenceVersions
  let naldAddresses
  let party

  beforeEach(() => {
    licence = PermitDataFixture.createLicence()

    naldAddresses = [
      PermitDataFixture.createAddress(),
      PermitDataFixture.createAddress({ ID: '1001' })
    ]

    licenceRoles = [
      PermitDataFixture.createRole(licence, { ACON_APAR_ID: '1001', ACON_AADD_ID: '1000', EFF_END_DATE: '05/07/2015' }),
      PermitDataFixture.createRole(licence, { ACON_APAR_ID: '1001', ACON_AADD_ID: '1001', EFF_ST_DATE: '06/07/2015' })
    ]

    licenceVersions = [
      PermitDataFixture.createVersion(
        licence,
        { ISSUE_NO: '1', INCR_NO: '1', EFF_ST_DATE: '01/04/2015', EFF_END_DATE: '05/07/2015' }
      ),
      PermitDataFixture.createVersion(
        licence,
        { ISSUE_NO: '1', INCR_NO: '2', EFF_ST_DATE: '06/07/2015', EFF_END_DATE: '12/08/2015' }
      ),
      PermitDataFixture.createVersion(
        licence,
        { ISSUE_NO: '2', INCR_NO: '1', EFF_ST_DATE: '13/08/2015', EFF_END_DATE: 'null' }
      )
    ]
  })

  experiment('when transforming a person', () => {
    beforeEach(() => {
      party = PermitDataFixture.createPerson()
    })

    test('the details are transformed correctly', () => {
      const result = Transformer.go(party, licenceVersions, licenceRoles, naldAddresses)

      expect(result).to.equal({
        type: 'person',
        name: 'SIR JOHN DOE',
        externalId: '1:1001',
        roleAddresses: [
          {
            role: 'licenceHolder',
            startDate: moment('2015-08-13'),
            endDate: null,
            address: {
              address1: 'BIG MANOR FARM',
              address2: 'BUTTERCUP LANE',
              address3: 'DAISY MEADOW',
              address4: null,
              country: 'ENGLAND',
              county: 'TESTINGSHIRE',
              externalId: '1:1000',
              postcode: 'TT1 1TT',
              town: 'TESTINGTON'
            }
          },
          {
            role: 'returnsTo',
            startDate: moment('2015-04-01'),
            endDate: moment('2015-07-05'),
            address: {
              address1: 'BIG MANOR FARM',
              address2: 'BUTTERCUP LANE',
              address3: 'DAISY MEADOW',
              address4: null,
              country: 'ENGLAND',
              county: 'TESTINGSHIRE',
              externalId: '1:1000',
              postcode: 'TT1 1TT',
              town: 'TESTINGTON'
            }
          },
          {
            role: 'returnsTo',
            startDate: moment('2015-07-06'),
            endDate: null,
            address: {
              address1: 'BIG MANOR FARM',
              address2: 'BUTTERCUP LANE',
              address3: 'DAISY MEADOW',
              address4: null,
              country: 'ENGLAND',
              county: 'TESTINGSHIRE',
              externalId: '1:1001',
              postcode: 'TT1 1TT',
              town: 'TESTINGTON'
            }
          }
        ],
        licenceHolderContact: {
          role: 'licenceHolder',
          startDate: moment('2015-04-01'),
          endDate: null,
          contact: {
            salutation: 'SIR',
            initials: 'J',
            firstName: 'JOHN',
            lastName: 'DOE',
            externalId: '1:1001'
          }
        }
      })
    })

    experiment('and when the person has no forename', () => {
      beforeEach(() => {
        party = PermitDataFixture.createPerson({ FORENAME: 'null' })
      })

      test('the initials are used as the first name', () => {
        const result = Transformer.go(party, licenceVersions, licenceRoles, naldAddresses)

        expect(result.name).to.equal('SIR J DOE')
      })
    })
  })

  experiment('when transforming an organisation', () => {
    beforeEach(() => {
      party = PermitDataFixture.createCompany()
    })

    test('the details are transformed correctly', () => {
      const result = Transformer.go(party, licenceVersions, licenceRoles, naldAddresses)

      expect(result).to.equal({
        type: 'organisation',
        name: 'BIG CO LTD',
        externalId: '1:1000',
        roleAddresses: [
          {
            role: 'licenceHolder',
            startDate: moment('2015-08-13'),
            endDate: null,
            address: {
              address1: 'BIG MANOR FARM',
              address2: 'BUTTERCUP LANE',
              address3: 'DAISY MEADOW',
              address4: null,
              country: 'ENGLAND',
              county: 'TESTINGSHIRE',
              externalId: '1:1000',
              postcode: 'TT1 1TT',
              town: 'TESTINGTON'
            }
          },
          {
            role: 'returnsTo',
            startDate: moment('2015-04-01'),
            endDate: moment('2015-07-05'),
            address: {
              address1: 'BIG MANOR FARM',
              address2: 'BUTTERCUP LANE',
              address3: 'DAISY MEADOW',
              address4: null,
              country: 'ENGLAND',
              county: 'TESTINGSHIRE',
              externalId: '1:1000',
              postcode: 'TT1 1TT',
              town: 'TESTINGTON'
            }
          },
          {
            role: 'returnsTo',
            startDate: moment('2015-07-06'),
            endDate: null,
            address: {
              address1: 'BIG MANOR FARM',
              address2: 'BUTTERCUP LANE',
              address3: 'DAISY MEADOW',
              address4: null,
              country: 'ENGLAND',
              county: 'TESTINGSHIRE',
              externalId: '1:1001',
              postcode: 'TT1 1TT',
              town: 'TESTINGTON'
            }
          }
        ],
        licenceHolderContact: null
      })
    })
  })
})
