const helpers = require('@envage/water-abstraction-helpers');
const date = require('./date');
const { groupBy, sortBy, flatMap } = require('lodash');

const mapAgreement = chargeAgreement => ({
  agreementCode: chargeAgreement.AFSA_CODE,
  startDate: date.mapNaldDate(chargeAgreement.EFF_ST_DATE),
  endDate: date.mapNaldDate(chargeAgreement.EFF_END_DATE)
});

const mapAgreements = (tptAgreements, accountAgreements) => {
  const mapped = [...tptAgreements, ...accountAgreements].map(mapAgreement);

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
