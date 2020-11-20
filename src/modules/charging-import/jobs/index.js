'use strict';

const IMPORT_CHARGING_DATA = 'import.charging-data';
const IMPORT_CHARGE_VERSION_METADATA = 'import.charge-version-metadata';

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

/**
 * Formats arguments to publish a PG boss event to import charge version metadata
 * @return {Object}
 */
const importChargeVersionMetadata = () => ({
  name: IMPORT_CHARGE_VERSION_METADATA,
  options: {
    singletonKey: `${IMPORT_CHARGE_VERSION_METADATA}`
  }
});

exports.IMPORT_CHARGING_DATA = IMPORT_CHARGING_DATA;
exports.importChargingData = importChargingData;

exports.IMPORT_CHARGE_VERSION_METADATA = IMPORT_CHARGE_VERSION_METADATA;
exports.importChargeVersionMetadata = importChargeVersionMetadata;
