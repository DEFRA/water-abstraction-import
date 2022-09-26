'use strict'

const {
  beforeEach,
  experiment,
  test
} = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const data = require('../data')

const { mapLicenceVersion } = require('../../../../../src/modules/licence-import/transform/mappers/licence-version')

experiment('modules/licence-import/transform/mappers/licence-version', () => {
  experiment('.mapLicenceVersion', () => {
    let mapped
    let licence
    let version

    beforeEach(async () => {
      licence = {
        ID: '123',
        FGAC_REGION_CODE: '6',
        STATUS: 'CURR',
        EFF_ST_DATE: '22/12/1989'
      }

      version = data.createVersion(licence, {
        ISSUE_NO: '101',
        INCR_NO: '2',
        EFF_ST_DATE: '22/12/1989',
        EFF_END_DATE: '22/12/1991'
      })
      mapped = mapLicenceVersion(version)
    })

    test('maps the issue number', async () => {
      expect(mapped.issue).to.equal(101)
    })

    test('maps the increment number', async () => {
      expect(mapped.increment).to.equal(2)
    })

    test('maps the status from CURR to current', async () => {
      expect(mapped.status).to.equal('current')
    })

    test('maps the status from DRAFT to draft', async () => {
      version = data.createVersion(licence, { STATUS: 'DRAFT' })
      mapped = mapLicenceVersion(version)
      expect(mapped.status).to.equal('draft')
    })

    test('maps the status from SUPER to superseded', async () => {
      version = data.createVersion(licence, { STATUS: 'SUPER' })
      mapped = mapLicenceVersion(version)
      expect(mapped.status).to.equal('superseded')
    })

    test('maps the start date to the required format', async () => {
      expect(mapped.startDate).to.equal('1989-12-22')
    })

    test('maps the end date to the required format', async () => {
      expect(mapped.endDate).to.equal('1991-12-22')
    })

    test('maps the end date when null', async () => {
      version = data.createVersion(licence, { EFF_END_DATE: 'null' })
      mapped = mapLicenceVersion(version)
      expect(mapped.endDate).to.equal(null)
    })

    test('creates an external id', async () => {
      // expected format is FGAC_REGION_CODE:AABL_ID:ISSUE_NO:INCR_NO
      expect(mapped.externalId).to.equal('6:123:101:2')
    })

    experiment('when there are purposes', () => {
      beforeEach(async () => {
        const purposes = [
          { issue: 101, increment: 2, notes: '101:2:a' },
          { issue: 101, increment: 2, notes: '101:2:b' },
          { issue: 101, increment: 1, notes: '101:1' }
        ]

        mapped = mapLicenceVersion(version, purposes)
      })

      test('the expected number of purposes are extracted', async () => {
        expect(mapped.purposes.length).to.equal(2)
      })

      test('only the purposes with matching issue and increment are mapped', async () => {
        expect(mapped.purposes.find(p => p.notes === '101:2:a')).to.exist()
        expect(mapped.purposes.find(p => p.notes === '101:2:b')).to.exist()
      })
    })
  })
})
