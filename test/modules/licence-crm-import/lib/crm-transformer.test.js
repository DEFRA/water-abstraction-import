'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const { experiment, test, beforeEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const moment = require('moment')
moment.locale('en-gb')
const PermitDataFixture = require('../../../support/permit-data.fixture.js')

// Thing under test
const CrmTransformer = require('../../../../src/modules/licence-crm-import/lib/crm-transformer.js')

experiment('modules/licence-crm-import/lib/crm-transformer', () => {
  let permitData

  beforeEach(() => {
    const licence = PermitDataFixture.createLicence()
    const roleDetail = PermitDataFixture.createRole(licence)
    const roleParty = PermitDataFixture.createParty()
    const roleAddress = PermitDataFixture.createAddress()
    const roleType = PermitDataFixture.createRoleType()

    const role = {
      role_party: roleParty,
      role_detail: roleDetail,
      role_address: roleAddress,
      role_type: roleType
    }

    const versions = [
      PermitDataFixture.createVersion(
        licence,
        { ISSUE_NO: '1', INCR_NO: '1', EFF_ST_DATE: '01/04/2015', EFF_END_DATE: '05/07/2015', STATUS: 'SUPER' }
      ),
      PermitDataFixture.createVersion(
        licence,
        { ISSUE_NO: '2', INCR_NO: '1', EFF_ST_DATE: '01/04/2015', EFF_END_DATE: '05/07/2015', STATUS: 'SUPER' }
      ),
      PermitDataFixture.createVersion(
        licence,
        { ISSUE_NO: '2', INCR_NO: '2', EFF_ST_DATE: '13/08/2015', EFF_END_DATE: 'null' }
      )
    ]

    versions.forEach((version) => {
      version.parties = [PermitDataFixture.createParty()]
      const address = PermitDataFixture.createAddress()

      version.parties[0].contacts = [
        {
          APAR_ID: version.parties[0].ID,
          AADD_ID: address.ID,
          DISABLED: 'N',
          FGAC_REGION_CODE: version.parties[0].FGAC_REGION_CODE,
          party_address: {
            ID: address.ID,
            ADDR_LINE1: address.ADDR_LINE1,
            LAST_CHANGED: '01/10/1999',
            DISABLED: 'N',
            ADDR_LINE2: address.ADDR_LINE2,
            ADDR_LINE3: address.ADDR_LINE3,
            ADDR_LINE4: address.ADDR_LINE4,
            TOWN: address.TOWN,
            COUNTY: address.COUNTY,
            POSTCODE: address.POSTCODE,
            COUNTRY: address.COUNTRY,
            APCO_CODE: 'null',
            FGAC_REGION_CODE: address.FGAC_REGION_CODE
          }
        }
      ]
    })

    permitData = {
      ...licence,
      data: {
        roles: [role],
        versions
      }
    }
  })

  experiment('when called', () => {
    test('returns the permit data formatted ready for persisting as a crm.document_header record', async () => {
      const result = CrmTransformer.go(permitData)

      expect(result).to.equal({
        system_external_id: '01/123',
        metadata: {
          contacts: [
            {
              role: 'Licence holder',
              type: 'Organisation',
              salutation: null,
              forename: null,
              initials: null,
              name: 'BIG CO LTD',
              addressLine1: 'BIG MANOR FARM',
              addressLine2: 'BUTTERCUP LANE',
              addressLine3: 'DAISY MEADOW',
              addressLine4: null,
              town: 'TESTINGTON',
              county: 'TESTINGSHIRE',
              postcode: 'TT1 1TT',
              country: 'ENGLAND'
            },
            {
              role: 'Returns to',
              type: 'Organisation',
              salutation: null,
              forename: null,
              initials: null,
              name: 'BIG CO LTD',
              addressLine1: 'BIG MANOR FARM',
              addressLine2: 'BUTTERCUP LANE',
              addressLine3: 'DAISY MEADOW',
              addressLine4: null,
              town: 'TESTINGTON',
              county: 'TESTINGSHIRE',
              postcode: 'TT1 1TT',
              country: 'ENGLAND'
            }
          ],
          IsCurrent: false
        }
      })
    })
  })
})
