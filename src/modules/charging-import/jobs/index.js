const IMPORT_CHARGING_DATA = 'import.charging-data';

/**
 * Formats arguments to publish a PG boss event to import all companies
 * @return {Object}
 */
const importChargingData = () => ({
  name: IMPORT_CHARGING_DATA,
  options: {
    singletonKey: `${IMPORT_CHARGING_DATA}`,
    singletonHours: 1,
    expireIn: '4 hour'
  }
});

exports.IMPORT_CHARGING_DATA = IMPORT_CHARGING_DATA;
exports.importChargingData = importChargingData;
