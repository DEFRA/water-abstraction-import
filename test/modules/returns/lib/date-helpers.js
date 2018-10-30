'use strict';

const { experiment, it } = module.exports.lab = require('lab').script();
const { expect } = require('code');

const {
  isDateWithinReturnCycle
} = require('../../../../src/modules/returns/lib/date-helpers');

experiment('isDateWithinReturnCycle', () => {
  const cycle = {
    start_date: '2017-11-01',
    end_date: '2018-10-31'
  };

  it('Should exclude dates before cycle', async () => {
    expect(isDateWithinReturnCycle(cycle, '2017-10-31')).to.equal(false);
  });

  it('Should include start date of cycle', async () => {
    expect(isDateWithinReturnCycle(cycle, '2017-11-01')).to.equal(true);
  });

  it('Should include dates within cycle', async () => {
    expect(isDateWithinReturnCycle(cycle, '2018-02-01')).to.equal(true);
  });

  it('Should include end date of cycle', async () => {
    expect(isDateWithinReturnCycle(cycle, '2018-10-31')).to.equal(true);
  });

  it('Should exclude dates outside cycle', async () => {
    expect(isDateWithinReturnCycle(cycle, '2018-11-01')).to.equal(false);
  });
});
