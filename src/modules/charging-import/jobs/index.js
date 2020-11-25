'use strict';

const IMPORT_CHARGING_DATA = 'import.charging-data';

/**
 * Formats arguments to publish a PG boss event to import all companies
 * @return {Object}
 */
const importChargingData = () => ({
  name: IMPORT_CHARGING_DATA,
  options: {
    singletonKey: `${IMPORT_CHARGING_DATA}`
  }
});

exports.IMPORT_CHARGING_DATA = IMPORT_CHARGING_DATA;
exports.importChargingData = importChargingData;
