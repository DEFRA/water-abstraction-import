'use strict';

const helpers = require('@envage/water-abstraction-helpers');
const date = require('./date');

const { groupBy, sortBy, flatMap } = require('lodash');

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

const mapAgreements = (tptAgreements, s130Agreements = []) => {
  const mapped = [...tptAgreements, ...s130Agreements].map(mapAgreement);

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

exports.mapAgreements = mapAgreements;
