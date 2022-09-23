'use strict'

const { test, experiment } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

const { mapAgreements } = require('../../../../../src/modules/licence-import/transform/mappers/agreement')

experiment('modules/licence-import/mappers/agreement', () => {
  const createAgreement = (overrides = {}) => ({
    AFSA_CODE: overrides.code || 'S127',
    EFF_ST_DATE: overrides.startDate || '01/01/2020',
    EFF_END_DATE: overrides.endDate || 'null',
    charge_version_end_date: overrides.chargeVersionEndDate || 'null',
    charge_version_start_date: overrides.chargeVersionStartDate || '01/01/2020',
    version_number: overrides.versionNumber || 1
  })

  test('maps agreements with no end date', async () => {
    const result = mapAgreements([createAgreement()])
    expect(result).to.equal([{ agreementCode: 'S127', startDate: '2020-01-01', endDate: null }])
  })

  test('maps agreements with an end date', async () => {
    const result = mapAgreements([createAgreement({ endDate: '01/06/2021' })])
    expect(result).to.equal([{ agreementCode: 'S127', startDate: '2020-01-01', endDate: '2021-06-01' }])
  })

  test('maps agreements with a charge version end date', async () => {
    const result = mapAgreements([createAgreement({ chargeVersionEndDate: '01/06/2021' })])
    expect(result).to.equal([{ agreementCode: 'S127', startDate: '2020-01-01', endDate: '2021-06-01' }])
  })

  test('uses the earliest end date when there is an end date and charge version end date', async () => {
    const result = mapAgreements([createAgreement({ endDate: '02/07/2021', chargeVersionEndDate: '01/06/2021' })])
    expect(result).to.equal([{ agreementCode: 'S127', startDate: '2020-01-01', endDate: '2021-06-01' }])
  })

  test('merges adjacent date ranges with the same code', async () => {
    const agreements = [
      createAgreement({ code: 'S130', endDate: '01/05/2020', versionNumber: 1 }),
      createAgreement({ endDate: '01/06/2021', versionNumber: 2 }),
      createAgreement({ startDate: '02/06/2021', versionNumber: 3 })
    ]
    const result = mapAgreements(agreements)
    expect(result[0]).to.equal({
      agreementCode: 'S130',
      startDate: '2020-01-01',
      endDate: '2020-05-01'
    })
    expect(result[1]).to.equal({ agreementCode: 'S127', startDate: '2020-01-01', endDate: null })
  })

  test('uses the latest start date when the charge version starts after the agreement start date', async () => {
    const result = mapAgreements([createAgreement({ chargeVersionStartDate: '02/01/2020' })])
    expect(result).to.equal([{ agreementCode: 'S127', startDate: '2020-01-02', endDate: null }])
  })

  test('merges duplicate agreements', async () => {
    const agreements = [
      createAgreement(),
      createAgreement()
    ]
    const result = mapAgreements(agreements)
    expect(result).to.be.an.array().length(1)
  })

  test('merges agreements with different date ranges on different elements', async () => {
    const agreements = [
      createAgreement({ startDate: '11/03/1993', chargeVersionStartDate: '11/10/1978', chargeVersionEndDate: '31/03/2006', versionNumber: 1 }),
      createAgreement({ startDate: '11/10/1978', chargeVersionStartDate: '11/10/1978', chargeVersionEndDate: '31/03/2006', versionNumber: 1 }),
      createAgreement({ startDate: '11/03/1993', chargeVersionStartDate: '01/04/2006', chargeVersionEndDate: '31/03/2014', versionNumber: 2 }),
      createAgreement({ startDate: '11/10/1978', chargeVersionStartDate: '01/04/2006', chargeVersionEndDate: '31/03/2014', versionNumber: 2 }),
      createAgreement({ startDate: '01/04/2014', chargeVersionStartDate: '01/04/2014', versionNumber: 4 })
    ]
    const result = mapAgreements(agreements)
    expect(result).to.be.an.array().length(1)
    expect(result[0].startDate).to.equal('1978-10-11')
    expect(result[0].endDate).to.equal(null)
  })
})
