'use strict';

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();
const moment = require('moment');
moment.locale('en-gb');

const { buildReturnsPacket, getLicenceFormats } = require('../../../src/modules/nald-import/transform-returns');
const queries = require('../../../src/modules/nald-import/lib/nald-queries/returns');
const helpers = require('../../../src/modules/nald-import/lib/transform-returns-helpers.js');
const dueDate = require('../../../src/modules/nald-import/lib/due-date');

experiment('modules/nald-import/transform-returns', () => {
  experiment('getLicenceFormats', () => {
    beforeEach(() => {
      const formats = [{ name: 'format1' }];

      sandbox.stub(queries, 'getSplitDate').returns();
      sandbox.stub(queries, 'getFormats').returns(formats);
      sandbox.stub(queries, 'getFormatPurposes').returns('formatPurposes');
      sandbox.stub(queries, 'getFormatPoints').returns('formatPoints');
      sandbox.stub(helpers, 'getFormatCycles').returns('formatCycles');
    });

    afterEach(() => {
      sandbox.restore();
    });

    test('adds purposes, points and cycles to format object', async () => {
      const licenceFormats = await getLicenceFormats('123/xyz');
      expect(licenceFormats[0].purposes).to.equal('formatPurposes');
      expect(licenceFormats[0].points).to.equal('formatPoints');
      expect(licenceFormats[0].cycles).to.equal('formatCycles');
    });
  });

  experiment('buildReturnsPacket', () => {
    const formats = [{}];
    const logs = [
      { DATE_FROM: '01/04/2018', DATE_TO: '31/03/2019' }
    ];

    const cycle = [{
      startDate: '2018-04-01',
      endDate: '2019-03-31',
      isCurrent: true
    }];

    beforeEach(() => {
      sandbox.stub(queries, 'getSplitDate').returns();
      sandbox.stub(queries, 'getFormats').returns(formats);
      sandbox.stub(queries, 'getFormatPurposes').returns('formatPurposes');
      sandbox.stub(queries, 'getFormatPoints').returns('formatPoints');
      sandbox.stub(helpers, 'getFormatCycles').returns(cycle);
      sandbox.stub(queries, 'getLogs').returns(logs);
      sandbox.stub(helpers, 'mapReceivedDate').returns();
      sandbox.stub(helpers, 'getStatus').returns();
      sandbox.stub(dueDate, 'getDueDate').returns('2019-04-28');
      sandbox.stub(helpers, 'mapPeriod').returns('monthly');
      sandbox.stub(helpers, 'formatReturnMetadata').returns({ version: 1 });
      sandbox.stub(helpers, 'getFormatEndDate');
    });

    afterEach(() => {
      sandbox.restore();
    });

    test('returns data as expected', async () => {
      const { returns } = await buildReturnsPacket('123/xyz');

      expect(returns[0].start_date).to.equal(cycle[0].startDate);
      expect(returns[0].end_date).to.equal(cycle[0].endDate);
      expect(returns[0].due_date).to.equal('2019-04-28');
      expect(returns[0].returns_frequency).to.equal('monthly');
      expect(returns[0].metadata).to.equal('{"version":1,"isCurrent":true,"isFinal":false}');
    });

    test('isFinal flag returns true if endDate matches format end date', async () => {
      helpers.getFormatEndDate.returns('2019-03-31');
      const { returns } = await buildReturnsPacket('123/xyz');

      expect(returns[0].metadata).to.include('"isFinal":true');
    });

    test('isFinal flag returns false if endDate does not match format end date', async () => {
      helpers.getFormatEndDate.returns('2019-04-01');
      const { returns } = await buildReturnsPacket('123/xyz');

      expect(returns[0].metadata).to.include('"isFinal":false');
    });
  });

  experiment('.getCycleLogs', () => {

  });
});
