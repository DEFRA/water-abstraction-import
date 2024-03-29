'use strict'

const sandbox = require('sinon').createSandbox()

const { experiment, test, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script()
const { expect } = require('@hapi/code')
const { v4: uuid } = require('uuid')

const returnsApi = require('../../../../src/lib/connectors/returns')
const db = require('../../../../src/modules/nald-import/lib/db')
const persistReturns = require('../../../../src/modules/nald-import/lib/persist-returns')

const naldReturn = {
  return_id: 'v1:123:456',
  regime: 'water',
  licence_type: 'abstraction',
  licence_ref: '01/234/567',
  start_date: '2016-11-01',
  end_date: '2017-10-31',
  returns_frequency: 'month',
  status: 'completed',
  source: 'NALD',
  metadata: JSON.stringify({ param: 'value', version: '1' }),
  received_date: '2017-11-24',
  return_requirement: '012345',
  due_date: '2017-11-28'
}

const digitalServiceReturn = {
  return_id: 'v1:234:789',
  regime: 'water',
  licence_type: 'abstraction',
  licence_ref: '04/567/890',
  start_date: '2017-11-01',
  end_date: '2018-10-31',
  returns_frequency: 'month',
  status: 'due',
  source: 'NALD',
  metadata: { param: 'value', version: '1' },
  received_date: '2018-11-24',
  return_requirement: '67890',
  due_date: '2018-11-28'
}

experiment('test/modules/nald-import/lib/persist-returns', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery').resolves([{}])

    sandbox.stub(returnsApi.returns, 'findOne')
    sandbox.stub(returnsApi.returns, 'create')
    sandbox.stub(returnsApi.returns, 'updateOne')

    sandbox.stub(returnsApi.versions, 'create').resolves({
      data: {
        version_id: uuid(),
        return_id: 'v1:234:789'
      }
    })
    sandbox.stub(returnsApi.versions, 'updateOne')

    sandbox.stub(returnsApi.lines, 'create')
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.returnExists', () => {
    test('returns true if return exists', async () => {
      returnsApi.returns.findOne.resolves({ error: null, data: digitalServiceReturn })
      const exists = await persistReturns.returnExists('01/123')
      expect(exists).to.equal(true)
    })

    test('returns false if return does not exist', async () => {
      returnsApi.returns.findOne.resolves({ error: { name: 'NotFoundError' }, data: null })
      const exists = await persistReturns.returnExists('01/123')
      expect(exists).to.equal(false)
    })
  })

  experiment('.getUpdateRow', () => {
    test('updates metadata, status, date received and due date for a past return', async () => {
      const data = persistReturns.getUpdateRow(naldReturn)
      expect(data).to.equal({
        status: 'completed',
        metadata: JSON.stringify({ param: 'value', version: '1' }),
        received_date: '2017-11-24',
        due_date: '2017-11-28'
      })
    })

    test('updates metadata and due date only for a return managed by the digital service', async () => {
      const data = persistReturns.getUpdateRow(digitalServiceReturn)
      expect(data).to.equal({
        metadata: { param: 'value', version: '1' },
        due_date: '2018-11-28'
      })
    })
  })

  experiment('.createOrUpdateReturn', () => {
    test('creates a row if the record is not present', async () => {
      returnsApi.returns.findOne.resolves({ error: { name: 'NotFoundError' }, data: null })
      returnsApi.returns.create.resolves({ error: null })

      await persistReturns.createOrUpdateReturn(naldReturn, '2018-01-01')

      expect(returnsApi.returns.create.firstCall.args[0]).to.equal(naldReturn)
      expect(returnsApi.returns.updateOne.firstCall).to.equal(null)
    })

    test('updates a NALD return if the record is present', async () => {
      returnsApi.returns.findOne.resolves({ error: null, data: naldReturn })
      returnsApi.returns.updateOne.resolves({ error: null })
      await persistReturns.createOrUpdateReturn(naldReturn, '2018-01-01')

      expect(returnsApi.returns.create.firstCall).to.equal(null)
      expect(returnsApi.returns.updateOne.firstCall.args).to.equal([naldReturn.return_id, {
        metadata: naldReturn.metadata,
        status: naldReturn.status,
        received_date: naldReturn.received_date,
        due_date: naldReturn.due_date
      }])
    })

    test('updates a digital service return metadata only if the record is present', async () => {
      returnsApi.returns.findOne.resolves({ error: null, data: digitalServiceReturn })
      returnsApi.returns.updateOne.resolves({ error: null })
      await persistReturns.createOrUpdateReturn(digitalServiceReturn, '2018-01-01')

      expect(returnsApi.returns.create.firstCall).to.equal(null)
      expect(returnsApi.returns.updateOne.firstCall.args).to.equal([digitalServiceReturn.return_id, {
        metadata: digitalServiceReturn.metadata,
        due_date: digitalServiceReturn.due_date
      }])
    })
  })
})
