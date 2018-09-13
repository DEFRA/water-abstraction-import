'use strict';

const { beforeEach, experiment, it } = module.exports.lab = require('lab').script();
const { expect } = require('code');
const { difference } = require('lodash');

const transformers = require('../../../../src/modules/returns/lib/transformers');

const returnResponse = require('../responses/return');
const monthlyLineResponse = require('../responses/lineMonthly');
const weeklyLineResponse = require('../responses/lineWeekly');

experiment('transformReturn', () => {
  let transformed;

  beforeEach(async () => {
    transformed = transformers.transformReturn(returnResponse);
  });

  it('includes the returns_frequency', async () => {
    expect(transformed.returns_frequency).to.equal(returnResponse.returns_frequency);
  });

  it('includes the licence_ref', async () => {
    expect(transformed.licence_ref).to.equal(returnResponse.licence_ref);
  });

  it('includes the start_date', async () => {
    expect(transformed.start_date).to.equal(returnResponse.start_date);
  });

  it('includes the end_date', async () => {
    expect(transformed.end_date).to.equal(returnResponse.end_date);
  });

  it('includes the regionCode', async () => {
    expect(transformed.regionCode).to.equal(returnResponse.metadata.nald.regionCode);
  });

  it('includes the formatId', async () => {
    expect(transformed.formatId).to.equal(returnResponse.metadata.nald.formatId);
  });

  it('does not include any other keys', async () => {
    const allowed = [
      'returns_frequency',
      'licence_ref',
      'start_date',
      'end_date',
      'status',
      'regionCode',
      'formatId'
    ];

    expect(difference(Object.keys(transformed), allowed)).to.have.length(0);
  });
});

experiment('transformLine', () => {
  let transformed;

  beforeEach(async () => {
    transformed = transformers.transformLine(monthlyLineResponse);
  });

  it('includes the quantity', async () => {
    expect(transformed.quantity).to.equal(monthlyLineResponse.quantity);
  });

  it('includes the start_date', async () => {
    expect(transformed.start_date).to.equal(monthlyLineResponse.start_date);
  });

  it('includes the end_date', async () => {
    expect(transformed.end_date).to.equal(monthlyLineResponse.end_date);
  });

  it('includes the time_period', async () => {
    expect(transformed.time_period).to.equal(monthlyLineResponse.time_period);
  });

  it('includes the reading_type', async () => {
    expect(transformed.reading_type).to.equal(monthlyLineResponse.reading_type);
  });

  it('includes the unit', async () => {
    expect(transformed.unit).to.equal(monthlyLineResponse.unit);
  });

  it('does not include any other keys', async () => {
    const allowed = [
      'quantity',
      'start_date',
      'end_date',
      'time_period',
      'reading_type',
      'unit'
    ];

    expect(difference(Object.keys(transformed), allowed)).to.have.length(0);
  });

  it('throws if passed a weekly line', async () => {
    expect(() => transformers.transformLine(weeklyLineResponse)).to.throw();
  });
});

experiment('transformWeeklyLine', () => {
  let transformed;

  beforeEach(async () => {
    transformed = transformers.transformWeeklyLine(weeklyLineResponse);
  });

  // the test response is a week in the range:
  // "start_date": "2017-10-29",
  // "end_date": "2017-11-04",
  it('returns an array of days of the week', async () => {
    expect(transformed).to.have.length(7);
    expect(transformed[0].start_date).to.equal('2017-10-29');
    expect(transformed[0].end_date).to.equal('2017-10-29');
    expect(transformed[1].start_date).to.equal('2017-10-30');
    expect(transformed[1].end_date).to.equal('2017-10-30');
    expect(transformed[2].start_date).to.equal('2017-10-31');
    expect(transformed[2].end_date).to.equal('2017-10-31');
    expect(transformed[3].start_date).to.equal('2017-11-01');
    expect(transformed[3].end_date).to.equal('2017-11-01');
    expect(transformed[4].start_date).to.equal('2017-11-02');
    expect(transformed[4].end_date).to.equal('2017-11-02');
    expect(transformed[5].start_date).to.equal('2017-11-03');
    expect(transformed[5].end_date).to.equal('2017-11-03');
    expect(transformed[6].start_date).to.equal('2017-11-04');
    expect(transformed[6].end_date).to.equal('2017-11-04');
  });

  it('the first 6 days have a value of zero', async () => {
    const firstSix = transformed.slice(0, 6);
    const allZero = firstSix.every(line => line.quantity === 0);
    expect(allZero).to.be.true();
  });

  it('includes the quantity value in the last day', async () => {
    expect(transformed[6].quantity).to.equal(weeklyLineResponse.quantity);
  });

  it('sets the time_period to day', async () => {
    expect(transformed.every(line => line.time_period === 'day')).to.be.true();
  });

  it('includes the reading_type', async () => {
    expect(transformed.every(line => {
      return line.reading_type === weeklyLineResponse.reading_type;
    })).to.be.true();
  });

  it('includes the unit', async () => {
    expect(transformed.every(line => {
      return line.unit === weeklyLineResponse.unit;
    })).to.be.true();
  });

  it('does not include any other keys', async () => {
    const allowed = [
      'quantity',
      'start_date',
      'end_date',
      'time_period',
      'reading_type',
      'unit'
    ];

    expect(difference(Object.keys(transformed[0]), allowed)).to.have.length(0);
  });

  it('throws if the time_period is not week', async () => {
    expect(() => transformers.transformWeeklyLineLine(monthlyLineResponse)).to.throw();
  });
});
