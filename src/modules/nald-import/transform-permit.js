const { orderBy } = require('lodash');
const dates = require('@envage/water-abstraction-helpers').nald.dates;

const licenceQueries = require('./lib/nald-queries/licences');
const partyQueries = require('./lib/nald-queries/parties');
const addressQueries = require('./lib/nald-queries/addresses');
const rolesQueries = require('./lib/nald-queries/roles');
const purposesQueries = require('./lib/nald-queries/purposes');

const cams = require('./lib/nald-queries/cams');

const { getEndDate } = require('./lib/end-date');

const { getFormatPoints, getFormatPurposes } = require('./lib/nald-queries/returns');

const { logger } = require('../../logger');

/**
 * Gets the purposes together with their points, agreements and conditions
 * for the specified current version
 * @param {Object} licenceRow
 * @param {Object} [currentVersion] - optional current version
 * @return {Promise}
 */
const getPurposesJson = async (licenceRow, currentVersion = null) => {
  const regionCode = licenceRow.FGAC_REGION_CODE;
  let purposes;
  if (currentVersion) {
    purposes = await purposesQueries.getPurposes(licenceRow.ID, regionCode, currentVersion.ISSUE_NO, currentVersion.INCR_NO);
  } else {
    purposes = await purposesQueries.getPurposes(licenceRow.ID, regionCode);
  }

  for (const purpose of purposes) {
    purpose.purpose = await purposesQueries.getPurpose({
      primary: purpose.APUR_APPR_CODE,
      secondary: purpose.APUR_APSE_CODE,
      tertiary: purpose.APUR_APUS_CODE
    });
    purpose.purposePoints = await purposesQueries.getPurposePoints(purpose.ID, regionCode);
    purpose.licenceAgreements = await purposesQueries.getPurposePointLicenceAgreements(purpose.ID, regionCode);
    purpose.licenceConditions = await purposesQueries.getPurposePointLicenceConditions(purpose.ID, regionCode);
  }
  return purposes;
};

/**
 * Gets current return formats for specified licence ID and region code
 * @param {Number} licenceId - from NALD_ABS_LICENCES table
 * @param {Number} regionCode - FGAC_REGION_CODE
 * @return {Promise} resolves with formats and purposes/points
 */
const getReturnFormats = async (licenceId, regionCode) => {
  const formats = await licenceQueries.getCurrentFormats(licenceId, regionCode);

  for (const format of formats) {
    format.points = await getFormatPoints(format.ID, regionCode);
    format.purposes = await getFormatPurposes(format.ID, regionCode);
  }

  return formats;
};

/**
 * Gets the JSON for the current version of the licence (if available)
 * @param {Object} licenceRow
 * return {Promise} resolves with object of current version, or null
 */
const getCurrentVersionJson = async (licenceRow) => {
  const regionCode = licenceRow.FGAC_REGION_CODE;
  const currentVersion = await licenceQueries.getCurrentVersion(licenceRow.ID, regionCode);

  if (currentVersion) {
    const data = {
      licence: currentVersion
    };

    data.licence.party = await partyQueries.getParties(currentVersion.ACON_APAR_ID, regionCode);

    for (const p in data.licence.parties) {
      data.licence.parties[p].contacts = await partyQueries.getPartyContacts(currentVersion.parties[p].ID, regionCode);
    }
    data.party = (await partyQueries.getParty(currentVersion.ACON_APAR_ID, regionCode))[0];
    data.address = (await addressQueries.getAddress(currentVersion.ACON_AADD_ID, regionCode))[0];
    data.original_effective_date = dates.calendarToSortable(licenceRow.ORIG_EFF_DATE);
    data.version_effective_date = dates.calendarToSortable(currentVersion.EFF_ST_DATE);
    data.expiry_date = dates.calendarToSortable(licenceRow.EXPIRY_DATE);

    data.purposes = await getPurposesJson(licenceRow, currentVersion);
    data.formats = await getReturnFormats(licenceRow.ID, regionCode);

    return data;
  }

  return null;
};

/**
 * Gets all licence versions (including current)
 * @param {Object} licenceRow
 * @return {Promise} resolves with versions array
 */
const getVersionsJson = async (licenceRow) => {
  const versions = await licenceQueries.getVersions(licenceRow.ID, licenceRow.FGAC_REGION_CODE);

  for (const version of versions) {
    version.parties = await partyQueries.getParties(version.ACON_APAR_ID, licenceRow.FGAC_REGION_CODE);
    for (const party of version.parties) {
      party.contacts = await partyQueries.getPartyContacts(party.ID, licenceRow.FGAC_REGION_CODE);
    }
  }
  return versions;
};

/**
 * Build full licence JSON for storing in permit repo from NALD import tables
 * @param {String} licenceNumber
 * @return {Promise} resolves with permit repo JSON packet
 */
const getLicenceJson = async (licenceNumber) => {
  try {
    const data = await licenceQueries.getLicence(licenceNumber);

    for (const licenceRow in data) {
      const thisLicenceRow = data[licenceRow];
      thisLicenceRow.vmlVersion = 2;
      thisLicenceRow.data = {};
      thisLicenceRow.data.versions = await getVersionsJson(thisLicenceRow);
      thisLicenceRow.data.current_version = await getCurrentVersionJson(thisLicenceRow);
      thisLicenceRow.data.cams = await cams.getCams(thisLicenceRow.AREP_CAMS_CODE, thisLicenceRow.FGAC_REGION_CODE);
      thisLicenceRow.data.roles = await rolesQueries.getRoles(thisLicenceRow.ID, thisLicenceRow.FGAC_REGION_CODE);
      thisLicenceRow.data.purposes = await getPurposesJson(thisLicenceRow);
      return thisLicenceRow;
    }
  } catch (error) {
    logger.error('Error getting licence JSON', error, { licenceNumber });
  }
};

/**
 * Gets the latest version of the specified licence data
 * by sorting on the effective start date of the versions array
 * - Note: this may not be the current version
 * @param {Array} versions - licence data versions array from NALD import process
 * @return {Object} latest version
 */
const getLatestVersion = (versions) => {
  const sortedVersions = orderBy(versions, (version) => {
    const issueNo = 1000 * parseInt(version.ISSUE_NO, 10);
    const incrNo = parseInt(version.INCR_NO, 10);
    return issueNo + incrNo;
  });
  return sortedVersions[sortedVersions.length - 1];
};

/**
 * Build packet of data to post to permit repository
 * @param {String} licenceRef - the licence number
 * @param {Number} regimeId - the numeric ID of the permitting regime
 * @param {Number} licenceTypeId - the ID of the licence type, e.g abstraction, impoundment etc
 * @param {Object} data - the licence JS object data
 * @return {Object} - packet of data for posting to permit repo
 */
const buildPermitRepoPacket = (licenceRef, regimeId, licenceTypeId, data) => {
  const latestVersion = getLatestVersion(data.data.versions);

  const permitRepoData = {
    licence_ref: licenceRef,
    licence_start_dt: dates.calendarToSortable(latestVersion.EFF_ST_DATE),
    licence_end_dt: getEndDate(data),
    licence_status_id: '1',
    licence_type_id: licenceTypeId,
    licence_regime_id: regimeId,
    licence_data_value: JSON.stringify(data)
  };

  // remove null attributes so as not to anger JOI
  if (permitRepoData.licence_end_dt == null) {
    delete permitRepoData.licence_end_dt;
  }

  if (permitRepoData.licence_start_dt == null) {
    delete permitRepoData.licence_start_dt;
  }
  return permitRepoData;
};

exports.getLicenceJson = getLicenceJson;
exports.buildPermitRepoPacket = buildPermitRepoPacket;
