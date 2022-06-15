'use strict';

const helpers = require('@envage/water-abstraction-helpers');
const date = require('./date');

const { groupBy, sortBy, flatMap, uniqBy, mapValues } = require('lodash');

const getUniqueKey = agreement =>
 `${agreement.startDate}:${agreement.endDate}:${agreement.agreementCode}`;

const mapAgreement = chargeAgreement => {
  // Start date is the later of the agreement start date or the
  // charge version start date.
  const startDate = date.getMaxDate([
    date.mapNaldDate(chargeAgreement.EFF_ST_DATE),
    date.mapNaldDate(chargeAgreement.charge_version_start_date)
  ]);

  // End date is the earlier of the agreement end date or the
  // charge version end date.  Either can be null.
  const endDate = date.getMinDate([
    date.mapNaldDate(chargeAgreement.EFF_END_DATE),
    date.mapNaldDate(chargeAgreement.charge_version_end_date)
  ]);

  return {
    agreementCode: chargeAgreement.AFSA_CODE,
    startDate,
    endDate
  };
};

/**
 * Maps element-level agreements to a single charge-level agreement
 * with the max possible date range
 * @param {Array<Object>} tptAgreements
 * @returns {Object}
 */
const mapElementLevelAgreements = tptAgreements => {
  const startDates = tptAgreements.map(row => date.mapNaldDate(row.EFF_ST_DATE));
  const endDates = tptAgreements.map(row => date.mapNaldDate(row.EFF_END_DATE));
  return {
    ...tptAgreements[0],
    EFF_ST_DATE: date.mapIsoDateToNald(date.getMinDate(startDates)),
    EFF_END_DATE: date.mapIsoDateToNald(date.getMaxDate(endDates))
  };
};

const getVersionNumber = chargeAgreement => chargeAgreement.version_number;

const mapTwoPartTariffAgreements = tptAgreements => {
  const chargeVersionGroups = groupBy(tptAgreements, getVersionNumber);
  const mappedGroups = mapValues(chargeVersionGroups, mapElementLevelAgreements);
  return Object.values(mappedGroups);
};

const mapAgreements = (tptAgreements, s130Agreements = []) => {
  const mappedTptAgreements = mapTwoPartTariffAgreements(tptAgreements);

  // Map and de-duplicate identical agreements
  const mapped = uniqBy(
    [...mappedTptAgreements, ...s130Agreements].map(mapAgreement),
    getUniqueKey
  );

  // Group by agreement code
  const groups = groupBy(mapped, agreement => agreement.agreementCode);

  // For each group, merge history
  const merged = Object.values(groups).map(group =>
    helpers.charging.mergeHistory(
      sortBy(group, agreement => agreement.startDate)
    )
  );

  return flatMap(merged);
};

module.exports = {
  mapAgreements
};
