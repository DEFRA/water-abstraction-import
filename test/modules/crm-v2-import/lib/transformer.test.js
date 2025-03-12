'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const moment = require('moment')
const CrmV2ImportFixture = require('../../../support/crm-v2-import.fixture.js')

// Things we need to stub
// const { lines, returns, versions } = require('../../../src/modules/returns/lib/returns.js')

// Thing under test
const Transformer = require('../../../../src/modules/crm-v2-import/lib/transformer.js')

experiment('modules/crm-v2-import/lib/transformer.js', () => {
  let licence
  let licenceRoles
  let licenceVersions
  let naldAddresses
  let party

  beforeEach(() => {
    licence = CrmV2ImportFixture.createLicence()

    naldAddresses = [
      CrmV2ImportFixture.createAddress(),
      CrmV2ImportFixture.createAddress({ ID: '1001' })
    ]

    licenceRoles = [
      CrmV2ImportFixture.createRole(licence, { ACON_APAR_ID: '1001', ACON_AADD_ID: '1000' })
    ]

    licenceVersions = [
      CrmV2ImportFixture.createVersion(
        licence,
        { ISSUE_NO: '1', INCR_NO: '1', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '05/07/2015' }
      ),
      CrmV2ImportFixture.createVersion(
        licence,
        { ISSUE_NO: '1', INCR_NO: '2', EFF_ST_DATE: '06/07/2015', EFF_END_DATE: '12/08/2015' }
      ),
      CrmV2ImportFixture.createVersion(
        licence,
        { ISSUE_NO: '2', INCR_NO: '1', EFF_ST_DATE: '13/08/2015', EFF_END_DATE: 'null' }
      )
    ]
  })

  experiment('when transforming a person', () => {
    beforeEach(() => {
      party = CrmV2ImportFixture.createPerson()
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
            startDate: moment('2016-04-01'),
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
        ],
        licenceHolderContact: {
          role: 'licenceHolder',
          startDate: moment('2015-04-02'),
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
  })

  experiment('when transforming an organisation', () => {
    beforeEach(() => {
      party = CrmV2ImportFixture.createCompany()
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
            startDate: moment('2016-04-01'),
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
        ],
        licenceHolderContact: null
      })
    })
  })
})
