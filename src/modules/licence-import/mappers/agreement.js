const helpers = require('@envage/water-abstraction-helpers');
const date = require('./date');
const { groupBy, sortBy, flatMap } = require('lodash');

const LICENCE_LEVEL_AGREEMENT_TYPES = ['S127', 'S130S', 'S130T', 'S130U', 'S130W'];

const mapAgreement = chargeAgreement => ({
  agreementCode: chargeAgreement.AFSA_CODE,
  startDate: date.mapNaldDate(chargeAgreement.EFF_ST_DATE),
  endDate: date.mapNaldDate(chargeAgreement.EFF_END_DATE)
});

const isLicenceLevelAgreement = agreement =>
  LICENCE_LEVEL_AGREEMENT_TYPES.includes(agreement.agreementCode);

const mapAgreements = (tptAgreements, accountAgreements) => {
  const mapped = [...tptAgreements, ...accountAgreements].map(mapAgreement);

  // Filter by licence-level agreement codes
  const filtered = mapped.filter(isLicenceLevelAgreement);

  // Group by agreement code
  const groups = groupBy(filtered, agreement => agreement.agreementCode);

  // For each group, merge history
  const merged = Object.values(groups).map(group =>
    helpers.charging.mergeHistory(
      sortBy(group, agreement => agreement.startDate)
    )
  );

  return flatMap(merged);
};

exports.mapAgreements = mapAgreements;
