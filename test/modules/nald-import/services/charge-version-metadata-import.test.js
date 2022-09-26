'use strict'

const { test, experiment, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')

const sandbox = require('sinon').createSandbox()

const chargeVersionMetadataImport = require('../../../../src/modules/nald-import/services/charge-version-metadata-import')
const { pool } = require('../../../../src/lib/connectors/db')

const queries = {
  charging: require('../../../../src/modules/nald-import/lib/nald-queries/charge-versions'),
  chargeVersionMetadata: require('../../../../src/modules/nald-import/lib/nald-queries/charge-versions-metadata')
}

const REGION_CODE = 1
const LICENCE_ID = 'test-licence-id'
const LICENCE_NUMBER = '01/234/ABC'
const START_DATE = '2019-01-01'
const WATER_LICENCE_ID = '00000000-0000-0000-0000-000000000000'

const chargeVersionRow = {
  start_date: START_DATE,
  end_date: null,
  version_number: 1,
  status: 'current',
  external_id: '1:123:1',
  licence_ref: LICENCE_NUMBER,
  source: 'nald',
  invoice_account_id: 'test-invoice-account-id',
  company_id: 'test-company-id',
  scheme: 'alcs',
  apportionment: false,
  error: false,
  billed_upto_date: '2020-03-31',
  region: REGION_CODE,
  licence_id: WATER_LICENCE_ID,
  is_nald_gap: false
}

const licence = {
  ID: LICENCE_ID,
  LIC_NO: LICENCE_NUMBER,
  FGAC_REGION_CODE: REGION_CODE,
  start_date: START_DATE,
  end_date: null,
  licence_id: WATER_LICENCE_ID
}

experiment('modules/charging-import/services/charge-version-import.js', () => {
  beforeEach(async () => {
    sandbox.stub(pool, 'query')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.importChargeVersions', () => {
    beforeEach(async () => {
      pool.query.withArgs(
        queries.charging.getNonDraftChargeVersionsForLicence, [REGION_CODE, LICENCE_ID]
      ).resolves({
        rows: [
          chargeVersionRow
        ]
      })

      await chargeVersionMetadataImport.importChargeVersionMetadataForLicence(licence)
    })

    test('the charge versions are fetched for the licence region and ID', async () => {
      expect(pool.query.calledWith(
        queries.charging.getNonDraftChargeVersionsForLicence,
        [REGION_CODE, LICENCE_ID]
      )).to.be.true()
    })

    test('the mapped charge versions are persisted', async () => {
      expect(pool.query.calledWith(
        queries.chargeVersionMetadata.insertChargeVersionMetadata,
        [
          chargeVersionRow.external_id,
          chargeVersionRow.version_number,
          chargeVersionRow.start_date,
          chargeVersionRow.end_date,
          chargeVersionRow.status,
          chargeVersionRow.is_nald_gap
        ]
      )).to.be.true()
    })

    test('unwanted charge versions are cleaned up', async () => {
      const [query, params] = pool.query.lastCall.args
      expect(query).to.equal('delete from water_import.charge_versions_metadata where external_id like $1 and external_id not in ($2)')
      expect(params).to.equal([
        `${licence.FGAC_REGION_CODE}:${licence.ID}:%`,
        chargeVersionRow.external_id
      ])
    })
  })
})
