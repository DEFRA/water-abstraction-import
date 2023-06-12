'use strict'

// Test framework dependencies
const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Sinon = require('sinon')

const { experiment, test, beforeEach, afterEach } = exports.lab = Lab.script()
const { expect } = Code

// Thing under test
const BaseNotifierLib = require('../../../src/lib/notifiers/base-notifier.lib.js')

experiment('BaseNotifierLib class', () => {
  let airbrakeFake
  let pinoFake

  beforeEach(async () => {
    // We use these fakes and the stubs in the tests to avoid Pino or Airbrake being instantiated during the test
    airbrakeFake = { notify: Sinon.fake.resolves({ id: 1 }), flush: Sinon.fake() }
    pinoFake = { info: Sinon.fake(), error: Sinon.fake() }
  })

  afterEach(() => {
    Sinon.restore()
  })

  experiment('#omg()', () => {
    const id = '1234567890'
    const message = 'say what test'

    beforeEach(async () => {
      Sinon.stub(BaseNotifierLib.prototype, '_setNotifier').returns(airbrakeFake)
      Sinon.stub(BaseNotifierLib.prototype, '_setLogger').returns(pinoFake)

      // Stub _formatLogPacket to simulate a child class which has provided an override
      Sinon.stub(BaseNotifierLib.prototype, '_formatLogPacket').returns({ message, id })
    })

    test("logs an 'info' message", () => {
      const expectedArgs = {
        message,
        id
      }
      const testNotifier = new BaseNotifierLib()
      testNotifier.omg(message, { id })

      expect(pinoFake.info.calledOnceWith(expectedArgs)).to.be.true()
    })

    test("does not send a notification to 'Errbit'", () => {
      const testNotifier = new BaseNotifierLib()
      testNotifier.omg(message)

      expect(airbrakeFake.notify.notCalled).to.be.true()
    })

    test("does not log an 'error' message", () => {
      const testNotifier = new BaseNotifierLib()
      testNotifier.omg(message)

      expect(pinoFake.error.notCalled).to.be.true()
    })
  })

  experiment('#omfg()', () => {
    const message = 'hell no test'
    const data = { offTheChart: true }

    beforeEach(async () => {
      // Stub _formatLogPacket and _formatNotifyPacket to simulate a child class which has provided the overrides
      Sinon.stub(BaseNotifierLib.prototype, '_formatLogPacket').returns({ message, ...data })
      Sinon.stub(BaseNotifierLib.prototype, '_formatNotifyPacket').returns({ message, session: { ...data } })
    })

    experiment('when the Airbrake notification succeeds', () => {
      beforeEach(async () => {
        Sinon.stub(BaseNotifierLib.prototype, '_setNotifier').returns(airbrakeFake)
        Sinon.stub(BaseNotifierLib.prototype, '_setLogger').returns(pinoFake)
      })

      test("does not log an 'info' message", () => {
        const testNotifier = new BaseNotifierLib()
        testNotifier.omfg(message, data)

        expect(pinoFake.info.notCalled).to.be.true()
      })

      test("sends a notification to 'Errbit'", () => {
        const expectedArgs = {
          message,
          session: {
            ...data
          }
        }
        const testNotifier = new BaseNotifierLib()
        testNotifier.omfg(message, data)

        expect(airbrakeFake.notify.calledOnceWith(expectedArgs)).to.be.true()
      })

      test("logs an 'error' message", () => {
        const expectedArgs = {
          message,
          ...data
        }
        const testNotifier = new BaseNotifierLib()
        testNotifier.omfg(message, data)

        expect(pinoFake.error.calledOnceWith(expectedArgs)).to.be.true()
      })
    })

    experiment('when the Airbrake notification fails', () => {
      let error

      beforeEach(async () => {
        // We specifically use a stub instead of a fake so we can then use Sinon's callsFake() function. See the test
        // below where callsFake() is used for more details.
        pinoFake = { info: Sinon.fake(), error: Sinon.stub() }
        Sinon.stub(BaseNotifierLib.prototype, '_setLogger').returns(pinoFake)

        error = new Error('Airbrake failed')
        airbrakeFake = { notify: Sinon.fake.resolves({ error }) }
        Sinon.stub(BaseNotifierLib.prototype, '_setNotifier').returns(airbrakeFake)
      })

      test("does not log an 'info' message", () => {
        const testNotifier = new BaseNotifierLib()
        testNotifier.omfg(message, data)

        expect(pinoFake.info.notCalled).to.be.true()
      })

      test("logs 2 'error' messages, the second containing details of the Airbrake failure", async () => {
        const expectedArgs = [
          { message, ...data },
          { message: 'TaskNotifierLib - Airbrake failed', error }
        ]
        const testNotifier = new BaseNotifierLib()
        testNotifier.omfg(message, { data })

        // We use Sinon callsFake() here in order to test our expectations. This is because Airbrake notify() actually
        // returns a promise, and it is on the calling code to handle the responses back. When we test sending the
        // Airbrake notification control immediately comes back to us whilst work continues in the background. If we
        // assert pinoFake.error.secondCall.calledWith() it always fails because the promise which calls it has not yet
        // resolved. So, callsFake() tells Sinon to call our anonymous function below that includes our assertion only
        // when pinoFake.error is called i.e. the Airbrake.notify() promise has resolved.
        pinoFake.error.callsFake(() => {
          expect(pinoFake.error.firstCall.calledWith(expectedArgs[0]))
          expect(pinoFake.error.secondCall.calledWith(expectedArgs[1]))
        })
      })
    })

    experiment('when the Airbrake notification errors', () => {
      let error

      beforeEach(async () => {
        pinoFake = { info: Sinon.fake(), error: Sinon.stub() }
        Sinon.stub(BaseNotifierLib.prototype, '_setLogger').returns(pinoFake)

        error = new Error('Airbrake errored')
        airbrakeFake = { notify: Sinon.fake.rejects({ error }) }
        Sinon.stub(BaseNotifierLib.prototype, '_setNotifier').returns(airbrakeFake)
      })

      test("does not log an 'info' message", () => {
        const testNotifier = new BaseNotifierLib()
        testNotifier.omfg(message, data)

        expect(pinoFake.info.notCalled).to.be.true()
      })

      test("logs 2 'error' messages, the second containing details of the Airbrake errors", async () => {
        const expectedArgs = [
          { message, ...data },
          { message: 'TaskNotifierLib - Airbrake failed', error }
        ]
        const testNotifier = new BaseNotifierLib()
        testNotifier.omfg(message, { data })

        pinoFake.error.callsFake(() => {
          expect(pinoFake.error.firstCall.calledWith(expectedArgs[0]))
          expect(pinoFake.error.secondCall.calledWith(expectedArgs[1]))
        })
      })
    })
  })

  experiment('#flush()', () => {
    beforeEach(async () => {
      Sinon.stub(BaseNotifierLib.prototype, '_setNotifier').returns(airbrakeFake)
    })

    test('tells the underlying Airbrake notifier to flush its queue of notifications', () => {
      const testNotifier = new BaseNotifierLib()
      testNotifier.flush()

      expect(airbrakeFake.flush.called).to.be.true()
    })
  })

  experiment('#_formatLogPacket()', () => {
    test("throws an error if '_formatLogPacket' is not overridden", async () => {
      const testNotifier = new BaseNotifierLib()

      expect(() => testNotifier.omg('Oops')).to.throw("Extending class must implement '_formatLogPacket()'")
    })
  })

  experiment('#_formatNotifyPacket()', () => {
    beforeEach(async () => {
      Sinon.stub(BaseNotifierLib.prototype, '_setLogger').returns(pinoFake)
      Sinon.stub(BaseNotifierLib.prototype, '_setNotifier').returns(airbrakeFake)

      // We need to stub _formatLogPacket in this test else we don't get to `_formatNotifyPacket()` because of the error
      // `_formatLogPacket()` will throw.
      Sinon.stub(BaseNotifierLib.prototype, '_formatLogPacket').callsFake(() => {
        return { message: 'Boom!' }
      })
    })

    test("throws an error if '_formatNotifyPacket' is not overridden", async () => {
      const testNotifier = new BaseNotifierLib()

      expect(() => testNotifier.omfg('Oops')).to.throw("Extending class must implement '_formatNotifyPacket()'")
    })
  })
})