'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const moment = require('moment')
const CrmV2Fixture = require('../../../support/crm-v2.fixture.js')

// Thing under test
const Transformer = require('../../../../src/modules/licence-crm-v2-import/lib/transformer.js')

experiment('modules/licence-crm-v2-import/lib/transformer.js', () => {
  let permitData

  beforeEach(() => {
    const licence = CrmV2Fixture.createLicence()
    const roleDetail = CrmV2Fixture.createRole(licence)
    const roleParty = CrmV2Fixture.createParty()
    const roleAddress = CrmV2Fixture.createAddress()

    const role = {
      role_party: roleParty,
      role_detail: roleDetail,
      role_address: roleAddress
    }

    const versions = [
      CrmV2Fixture.createVersion(
        licence,
        { ISSUE_NO: '1', INCR_NO: '1', EFF_ST_DATE: '01/04/2015', EFF_END_DATE: '05/07/2015', STATUS: 'SUPER' }
      ),
      CrmV2Fixture.createVersion(
        licence,
        { ISSUE_NO: '2', INCR_NO: '1', EFF_ST_DATE: '01/04/2015', EFF_END_DATE: '05/07/2015' }
      ),
      CrmV2Fixture.createVersion(
        licence,
        { ISSUE_NO: '2', INCR_NO: '2', EFF_ST_DATE: '13/08/2015', EFF_END_DATE: 'null' }
      )
    ]

    versions.forEach((version) => {
      version.parties = [ CrmV2Fixture.createParty() ]
    })

    permitData = {
      ...licence,
      data: {
        roles: [role],
        versions
      }
    }
  })

  experiment('when transforming a licence', () => {
    test('the details are transformed correctly', () => {
      const result = Transformer.go(permitData)

      expect(result.document).to.equal({
        documentRef: '01/123',
        startDate: '2015-04-01',
        endDate: null,
        externalId: '1:123'
      })

      expect(result.documentRoles).to.equal([
        {
          role: 'licenceHolder',
          startDate: moment('2015-08-13'),
          endDate: null,
          companyExternalId: '1:1000',
          contactExternalId: null,
          addressExternalId: '1:1000'
        },
        {
          role: 'returnsTo',
          startDate: '2015-04-01',
          endDate: null,
          companyExternalId: '1:1000',
          contactExternalId: null,
          addressExternalId: '1:1000'
        }
      ])
    })
  })
})
