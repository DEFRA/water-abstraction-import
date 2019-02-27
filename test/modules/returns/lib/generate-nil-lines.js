'use strict';

const moment = require('moment');
moment.locale('en-gb');

const { experiment, it } = module.exports.lab = require('lab').script();
const { expect } = require('code');

const {
  isDateWithinAbstractionPeriod,
  getAbsPeriod,
  mapLine
} = require('../../../../src/modules/returns/lib/generate-nil-lines');

const sameYear = {
  periodStartDay: 5,
  periodStartMonth: 3,
  periodEndDay: 25,
  periodEndMonth: 12
};

const differentYear = {
  periodStartDay: 1,
  periodStartMonth: 10,
  periodEndDay: 8,
  periodEndMonth: 6
};

const allYear = {
  periodStartDay: 1,
  periodStartMonth: 1,
  periodEndDay: 31,
  periodEndMonth: 12
};

experiment('isDateWithinAbstractionPeriod', () => {
  it('Period start/end in same year', async () => {
    expect(isDateWithinAbstractionPeriod('2018-01-01', sameYear)).to.equal(false);
    expect(isDateWithinAbstractionPeriod('2018-03-04', sameYear)).to.equal(false);
    expect(isDateWithinAbstractionPeriod('2018-03-05', sameYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2018-12-25', sameYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2018-12-26', sameYear)).to.equal(false);
    expect(isDateWithinAbstractionPeriod('2018-12-31', sameYear)).to.equal(false);
  });

  it('Period start/end in different year', async () => {
    expect(isDateWithinAbstractionPeriod('2018-09-30', differentYear)).to.equal(false);
    expect(isDateWithinAbstractionPeriod('2018-10-01', differentYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2018-12-31', differentYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2019-01-01', differentYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2019-06-08', differentYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2019-06-09', differentYear)).to.equal(false);
  });

  it('Period all year', async () => {
    expect(isDateWithinAbstractionPeriod('2017-12-31', allYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2018-01-01', allYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2018-12-31', allYear)).to.equal(true);
    expect(isDateWithinAbstractionPeriod('2019-01-01', allYear)).to.equal(true);
  });
});

experiment('Test getAbsPeriod', () => {
  const returnData = {
    metadata: {
      nald: {
        periodStartDay: '2',
        periodStartMonth: '4',
        periodEndDay: '5',
        periodEndMonth: '11'
      }
    }
  };

  it('Should extract abstraction period start/end dates as integers', async () => {
    const dates = getAbsPeriod(returnData);
    expect(dates).to.equal({
      periodStartDay: 2,
      periodStartMonth: 4,
      periodEndDay: 5,
      periodEndMonth: 11
    });
  });
});

experiment('Test mapLine', () => {
  const absPeriod = {
    periodStartDay: 2,
    periodStartMonth: 4,
    periodEndDay: 5,
    periodEndMonth: 11
  };

  it('Should return 0 quantity within abstraction period ', async () => {
    const line = { startDate: '2018-05-01', endDate: '2018-05-30', timePeriod: 'month' };
    const mapped = mapLine(line, absPeriod, 'month');
    expect(mapped).to.equal({ start_date: '2018-05-01',
      end_date: '2018-05-30',
      quantity: 0,
      units: 'm³',
      user_unit: 'm³',
      reading_type: 'measured',
      time_period: 'month' });
  });

  it('Should return null quantity before abstraction period starts', async () => {
    const line = { startDate: '2018-03-11', endDate: '2018-03-17', timePeriod: 'week' };
    const mapped = mapLine(line, absPeriod, 'week');
    expect(mapped).to.equal({ start_date: '2018-03-11',
      end_date: '2018-03-17',
      quantity: null,
      units: 'm³',
      user_unit: 'm³',
      reading_type: 'measured',
      time_period: 'week' });
  });

  it('Should return null quantity after abstraction period ends', async () => {
    const line = { startDate: '2018-11-11', endDate: '2018-11-11', timePeriod: 'day' };
    const mapped = mapLine(line, absPeriod, 'week');
    expect(mapped).to.equal({ start_date: '2018-11-11',
      end_date: '2018-11-11',
      quantity: null,
      units: 'm³',
      user_unit: 'm³',
      reading_type: 'measured',
      time_period: 'day' });
  });
});
