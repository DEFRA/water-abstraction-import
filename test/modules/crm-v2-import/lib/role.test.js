'use strict'

const {
  experiment,
  test,
  beforeEach
} = exports.lab = require('@hapi/lab').script()

const { expect } = require('@hapi/code')

const mapper = require('../../../../../src/modules/licence-import/transform/mappers/role')

experiment('modules/licence-import/transform/mappers/role', () => {
  experiment('.mapLicenceHolderRoles', () => {
    const licenceVersions = [{
      FGAC_REGION_CODE: '1',
      ISSUE_NO: '1',
      INCR_NO: '100',
      EFF_ST_DATE: '01/01/2020',
      EFF_END_DATE: '30/04/2020',
      STATUS: 'DRAFT',
      ACON_APAR_ID: '123',
      ACON_AADD_ID: '456'
    }, {
      FGAC_REGION_CODE: '1',
      ISSUE_NO: '2',
      INCR_NO: '100',
      EFF_ST_DATE: '01/05/2020',
      EFF_END_DATE: '01/05/2020',
      STATUS: 'SUPER',
      ACON_APAR_ID: '123',
      ACON_AADD_ID: '456'
    }, {
      FGAC_REGION_CODE: '1',
      ISSUE_NO: '2',
      INCR_NO: '101',
      EFF_ST_DATE: '01/05/2020',
      EFF_END_DATE: '01/05/2020',
      STATUS: 'SUPER',
      ACON_APAR_ID: '123',
      ACON_AADD_ID: '456'
    }, {
      FGAC_REGION_CODE: '1',
      ISSUE_NO: '2',
      INCR_NO: '102',
      EFF_ST_DATE: '01/05/2020',
      EFF_END_DATE: 'null',
      STATUS: 'CURR',
      ACON_APAR_ID: '123',
      ACON_AADD_ID: '456'
    }]

    const document = {
      startDate: '2020-01-01',
      endDate: null
    }

    const context = {
      parties: {
        1: {
          123: {
            company: {
              name: 'test'
            },
            contact: null
          }
        }
      },
      addresses: {
        1: {
          456: {
            address1: 'Buttercup Farm'
          }
        }
      }
    }

    let roles

    beforeEach(async () => {
      roles = mapper.mapLicenceHolderRoles(document, licenceVersions, context)
    })

    test('maps a single valid role', async () => {
      expect(roles).to.be.an.array().length(1)
    })

    test('maps the single valid role', async () => {
      expect(roles[0].role).to.equal('licenceHolder')
      expect(roles[0].startDate).to.equal('2020-05-01')
      expect(roles[0].endDate).to.equal(null)
      expect(roles[0].company).to.equal(context.parties['1']['123'].company)
      expect(roles[0].contact).to.be.null()
      expect(roles[0].address).to.equal(context.addresses['1']['456'])
    })
  })
})
