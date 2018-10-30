'use strict';

const { experiment, it } = module.exports.lab = require('lab').script();
const { expect } = require('code');
const { uniq } = require('lodash');

const {
  getDays,
  getMonths,
  getWeeks,
  getRequiredLines,
  isDateWithinAbstractionPeriod,
  getAbsPeriod,
  mapLine,
  isDateWithinReturnCycle
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

experiment('getDays', () => {
  it('Should generate a line for each day', async () => {
    const days = getDays('2018-01-01', '2018-12-31');
    expect(days.length).to.equal(365);
  });

  it('Should generate a line for each day on leap years', async () => {
    const days = getDays('2020-01-01', '2020-12-31');
    expect(days.length).to.equal(366);
  });

  it('Should generate correct lines', async () => {
    const days = getDays('2018-01-20', '2018-02-10');
    expect(days[0].startDate).to.equal('2018-01-20');
    expect(days[0].endDate).to.equal('2018-01-20');
    expect(days[days.length - 1].startDate).to.equal('2018-02-10');
    expect(days[days.length - 1].endDate).to.equal('2018-02-10');
  });

  it('Should output `day` as the period', async () => {
    const days = getDays('2018-01-01', '2018-12-31');
    const periods = uniq(days.map(day => day.timePeriod));
    expect(periods).to.equal(['day']);
  });
});

experiment('getMonths', () => {
  it('Should generate a line for each month', async () => {
    const months = getMonths('2018-01-01', '2018-12-31');
    expect(months.length).to.equal(12);
  });

  it('Should output `month` as the period', async () => {
    const days = getMonths('2018-01-01', '2018-12-31');
    const periods = uniq(days.map(day => day.timePeriod));
    expect(periods).to.equal(['month']);
  });

  it('Should generate correct months', async () => {
    const months = getMonths('2018-01-01', '2018-12-31');
    expect(months).to.equal([
      { startDate: '2018-01-01',
        endDate: '2018-01-31',
        timePeriod: 'month' },
      { startDate: '2018-02-01',
        endDate: '2018-02-28',
        timePeriod: 'month' },
      { startDate: '2018-03-01',
        endDate: '2018-03-31',
        timePeriod: 'month' },
      { startDate: '2018-04-01',
        endDate: '2018-04-30',
        timePeriod: 'month' },
      { startDate: '2018-05-01',
        endDate: '2018-05-31',
        timePeriod: 'month' },
      { startDate: '2018-06-01',
        endDate: '2018-06-30',
        timePeriod: 'month' },
      { startDate: '2018-07-01',
        endDate: '2018-07-31',
        timePeriod: 'month' },
      { startDate: '2018-08-01',
        endDate: '2018-08-31',
        timePeriod: 'month' },
      { startDate: '2018-09-01',
        endDate: '2018-09-30',
        timePeriod: 'month' },
      { startDate: '2018-10-01',
        endDate: '2018-10-31',
        timePeriod: 'month' },
      { startDate: '2018-11-01',
        endDate: '2018-11-30',
        timePeriod: 'month' },
      { startDate: '2018-12-01',
        endDate: '2018-12-31',
        timePeriod: 'month' } ]);
  });

  it('Should generate a month if the start date is anywhere within the month', async () => {
    const months = getMonths('2018-03-15', '2018-03-16');
    expect(months).to.equal([
      { startDate: '2018-03-01',
        endDate: '2018-03-31',
        timePeriod: 'month' }]);
  });

  it('Should generate a month if the end date is anywhere within the month', async () => {
    const months = getMonths('2018-03-15', '2018-04-01');
    expect(months).to.equal([
      { startDate: '2018-03-01',
        endDate: '2018-03-31',
        timePeriod: 'month' },
      { startDate: '2018-04-01',
        endDate: '2018-04-30',
        timePeriod: 'month' }]);
  });
});

experiment('getWeeks', () => {
  it('Should generate a line for each week running Sunday - Saturday', async () => {
    const weeks = getWeeks('2018-01-01', '2018-12-31');

    expect(weeks[0].startDate).to.equal('2017-12-31');
    expect(weeks[0].endDate).to.equal('2018-01-06');

    expect(weeks[weeks.length - 1].startDate).to.equal('2018-12-23');
    expect(weeks[weeks.length - 1].endDate).to.equal('2018-12-29');
  });

  it('Should output `week` as the period', async () => {
    const days = getWeeks('2018-01-01', '2018-12-31');
    const periods = uniq(days.map(day => day.timePeriod));
    expect(periods).to.equal(['week']);
  });
});

experiment('getRequiredLines', () => {
  it('Should generate daily lines', async () => {
    const lines = getRequiredLines('2018-01-01', '2018-12-31', 'day');
    expect(lines[0].timePeriod).to.equal('day');
  });
  it('Should generate weekly lines', async () => {
    const lines = getRequiredLines('2018-01-01', '2018-12-31', 'week');
    expect(lines[0].timePeriod).to.equal('week');
  });
  it('Should generate monthly lines', async () => {
    const lines = getRequiredLines('2018-01-01', '2018-12-31', 'month');
    expect(lines[0].timePeriod).to.equal('month');
  });
  it('Should generate yearly lines', async () => {
    const lines = getRequiredLines('2018-01-01', '2018-12-31', 'year');
    expect(lines[0].timePeriod).to.equal('year');
  });
});

experiment('Test isDateWithinAbstractionPeriod', () => {
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
