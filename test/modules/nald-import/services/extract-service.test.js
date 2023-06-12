'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Test helpers
const moment = require('moment')
moment.locale('en-gb')

// Things we need to stub
const loadCsvService = require('../../../../src/modules/nald-import/services/load-csv-service')
const processHelper = require('@envage/water-abstraction-helpers').process
const s3Service = require('../../../../src/modules/nald-import/services/s3-service')
const schemaService = require('../../../../src/modules/nald-import/services/schema-service')
const zipService = require('../../../../src/modules/nald-import/services/zip-service')

// Thing under test
const extractService = require('../../../../src/modules/nald-import/services/extract-service')

experiment('modules/nald-import/services/extract-service', () => {
  beforeEach(async () => {
    Sinon.stub(loadCsvService, 'importFiles')
    Sinon.stub(processHelper, 'execCommand')
    Sinon.stub(s3Service, 'download')
    Sinon.stub(schemaService, 'dropAndCreateSchema')
    Sinon.stub(schemaService, 'swapTemporarySchema')
    Sinon.stub(zipService, 'extract')
  })

  afterEach(async () => {
    Sinon.restore()
  })

  experiment('.downloadAndExtract', () => {
    beforeEach(async () => {
      await extractService.downloadAndExtract()
    })

    test('the steps are called in the correct order', async () => {
      Sinon.assert.callOrder(
        processHelper.execCommand,
        processHelper.execCommand,
        processHelper.execCommand,
        s3Service.download,
        zipService.extract,
        schemaService.dropAndCreateSchema,
        loadCsvService.importFiles,
        schemaService.swapTemporarySchema,
        processHelper.execCommand,
        processHelper.execCommand,
        processHelper.execCommand
      )
    })

    test('the correct schemas are used', async () => {
      expect(schemaService.dropAndCreateSchema.calledWith('import_temp')).to.be.true()
      expect(loadCsvService.importFiles.calledWith('import_temp')).to.be.true()
    })
  })

  experiment('.copyTestFiles', () => {
    beforeEach(async () => {
      await extractService.copyTestFiles()
    })

    test('the steps are called in the correct order', async () => {
      Sinon.assert.callOrder(
        processHelper.execCommand,
        processHelper.execCommand,
        processHelper.execCommand,
        schemaService.dropAndCreateSchema,
        processHelper.execCommand,
        loadCsvService.importFiles
      )
    })

    test('the CSVs are copied from the correct location', async () => {
      expect(processHelper.execCommand.getCall(3).args[0]).to.equal('cp ./test/dummy-csv/* temp/NALD')
    })
  })
})
