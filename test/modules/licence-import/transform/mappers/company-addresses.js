'use strict'

const { test, experiment, beforeEach } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

const { mapCompanyAddresses } = require('../../../../../src/modules/licence-import/transform/mappers/company-address')

experiment('modules/licence-import/mappers/company-addresses', () => {
  let context, result

  beforeEach(async () => {
    context = {
      addresses: {
        1: {
          100: {
            address1: 'Buttercup farm'
          },
          101: {
            address1: 'Daisy farm'
          }
        }
      },
      parties: {
        1: {
          100: {
            company: {
              name: 'Test Co Ltd'
            },
            contact: null
          }
        }
      }
    }
  })

  experiment('mapCompanyAddresses', () => {
    experiment('for licence roles', async () => {
      beforeEach(async () => {
        result = mapCompanyAddresses([], [], [{
          ALRT_CODE: 'RT',
          EFF_ST_DATE: '01/01/2020',
          EFF_END_DATE: '01/06/2020',
          FGAC_REGION_CODE: 1,
          ACON_AADD_ID: 100
        }, {
          ALRT_CODE: 'RT',
          EFF_ST_DATE: '02/06/2020',
          EFF_END_DATE: 'null',
          FGAC_REGION_CODE: 1,
          ACON_AADD_ID: 101
        }], context)
      })

      test('maps the first returns to role', async () => {
        const [role] = result
        expect(role.role).to.equal('returnsTo')
        expect(role.startDate).to.equal('2020-01-01')
        expect(role.endDate).to.equal('2020-06-01')
        expect(role.address).to.equal(context.addresses[1][100])
      })

      test('maps the second returns to role', async () => {
        const [, role] = result
        expect(role.role).to.equal('returnsTo')
        expect(role.startDate).to.equal('2020-06-02')
        expect(role.endDate).to.equal(null)
        expect(role.address).to.equal(context.addresses[1][101])
      })
    })
  })
})
