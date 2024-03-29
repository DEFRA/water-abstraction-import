'use strict'

const sandbox = require('sinon').createSandbox()
const { expect } = require('@hapi/code')
const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script()

const fs = require('fs')
const EventEmitter = require('events')

const config = require('../../../config')
const s3Connector = require('../../../src/lib/connectors/s3')
const s3Service = require('../../../src/lib/services/s3')

const BUCKET = 'test-bucket'

experiment('lib/services/s3', () => {
  let stub, read, write

  beforeEach(async () => {
    sandbox.stub(config.s3, 'bucket').value(BUCKET)

    write = new EventEmitter()
    sandbox.spy(write, 'on')

    read = new EventEmitter()
    sandbox.spy(read, 'on')
    read.pipe = sandbox.spy()

    stub = {
      headObject: sandbox.stub().returnsThis(),
      upload: sandbox.stub().returnsThis(),
      getObject: sandbox.stub().returnsThis(),
      createReadStream: sandbox.stub().returns(read),
      promise: sandbox.stub().resolves()
    }
    sandbox.stub(s3Connector, 'getS3').returns(stub)
    sandbox.stub(fs, 'createWriteStream').returns(write)
  })

  afterEach(async () => {
    sandbox.restore()
  })

  experiment('.upload', () => {
    let buffer

    beforeEach(async () => {
      buffer = Buffer.from('test-contents')
      await s3Service.upload('test/key.txt', buffer)
    })

    test('calls upload on connector with correct options', async () => {
      expect(stub.upload.calledWith({
        Key: 'test/key.txt',
        Bucket: BUCKET,
        Body: buffer
      })).to.be.true()
    })

    test('calls promise() method', async () => {
      expect(stub.promise.called).to.be.true()
    })

    test('chains methods in correct order', async () => {
      sandbox.assert.callOrder(
        stub.upload,
        stub.promise
      )
    })
  })

  experiment('.getObject', () => {
    beforeEach(async () => {
      await s3Service.getObject('test/key.txt')
    })

    test('calls upload on connector with correct options', async () => {
      expect(stub.getObject.calledWith({
        Key: 'test/key.txt',
        Bucket: BUCKET
      })).to.be.true()
    })

    test('calls promise() method', async () => {
      expect(stub.promise.called).to.be.true()
    })

    test('chains methods in correct order', async () => {
      sandbox.assert.callOrder(
        stub.getObject,
        stub.promise
      )
    })
  })

  experiment('.download', () => {
    experiment('when there is no read error', () => {
      beforeEach(async () => {
        await Promise.all([
          s3Service.download('test/key.txt', 'test-destination/'),
          write.emit('close')
        ])
      })

      test('calls fs.createWriteStream with correct path', async () => {
        expect(fs.createWriteStream.calledWith('test-destination/'))
      })

      test('calls getObject on connector with correct options', async () => {
        expect(stub.getObject.calledWith({
          Key: 'test/key.txt',
          Bucket: BUCKET
        })).to.be.true()
      })

      test('calls createReadStream', async () => {
        expect(stub.createReadStream.called).to.be.true()
      })

      test('calls .pipe() on read stream', async () => {
        expect(read.pipe.called).to.be.true()
      })
    })

    test('when there is a read error, rejects', async () => {
      const func = () => Promise.all([
        s3Service.download('test/key.txt', 'test-destination/'),
        read.emit('error', new Error())
      ])
      expect(func()).to.reject()
    })
  })

  experiment('.getHead', () => {
    beforeEach(async () => {
      await s3Service.getHead('test/key.txt')
    })

    test('calls headObject on connector with correct options', async () => {
      expect(stub.headObject.calledWith({
        Key: 'test/key.txt',
        Bucket: BUCKET
      })).to.be.true()
    })

    test('calls promise() method', async () => {
      expect(stub.promise.called).to.be.true()
    })

    test('chains methods in correct order', async () => {
      sandbox.assert.callOrder(
        stub.headObject,
        stub.promise
      )
    })
  })
})
