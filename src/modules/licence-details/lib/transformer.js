'use strict'

const DateHelpers = require('../../../lib/date-helpers.js')
const { isLicenceVersionReplaced } = require('./legacy.js')

const REGIONS = {
  AN: 'Anglian',
  MD: 'Midlands',
  NO: 'Northumbria',
  NW: 'North West',
  SO: 'Southern',
  SW: 'South West (incl Wessex)',
  TH: 'Thames',
  WL: 'Wales',
  YO: 'Yorkshire'
}

const STATUSES = {
  CURR: 'current',
  SUPER: 'superseded',
  DRAFT: 'draft'
}

function go (
  naldAddresses,
  naldLicence,
  naldLicenceRoles,
  naldLicenceVersions,
  naldLicenceVersionPurposes,
  naldLicenceVersionPurposeConditions,
  naldParties) {
  const licence = _licence(naldLicence, naldLicenceVersions)
  const licenceVersionPurposes = _licenceVersionPurposes(naldLicenceVersionPurposes)
  const licenceVersionPurposeConditions = _licenceVersionPurposeConditions(naldLicenceVersionPurposeConditions)

  const document = _document(licence)
  const licenceHolderRoles = _licenceHolderRoles(document, naldLicenceVersions, naldAddresses, naldParties)
  const returnsToRoles = _returnsToRoles(naldLicenceRoles, naldAddresses, naldParties)

  const licenceVersions = _licenceVersions(naldLicenceVersions)

  return {
    document,
    documentRoles: [...licenceHolderRoles, ...returnsToRoles],
    licence,
    licenceVersionPurposeConditions,
    licenceVersionPurposes,
    licenceVersions
  }
}

function _matchAddressForRole (roleAddressId, roleRegionCode, naldAddresses) {
  return naldAddresses.find((naldAddress) => {
    return naldAddress.ID === roleAddressId && naldAddress.FGAC_REGION_CODE === roleRegionCode
  })
}

function _matchPartyForRole (rolePartyId, roleRegionCode, naldParties) {
  return naldParties.find((naldParty) => {
    return naldParty.ID === rolePartyId && naldParty.FGAC_REGION_CODE === roleRegionCode
  })
}

function _licenceVersions (naldLicenceVersions) {
  return naldLicenceVersions.map((naldLicenceVersion) => {
    const { FGAC_REGION_CODE, AABL_ID, EFF_END_DATE, EFF_ST_DATE, ISSUE_NO, INCR_NO, STATUS } = naldLicenceVersion

    return {
      issue: +ISSUE_NO,
      increment: +INCR_NO,
      status: STATUSES[STATUS],
      startDate: DateHelpers.mapNaldDate(EFF_ST_DATE),
      endDate: DateHelpers.mapNaldDate(EFF_END_DATE),
      externalId: `${FGAC_REGION_CODE}:${AABL_ID}:${ISSUE_NO}:${INCR_NO}`
    }
  })
}

function _returnsToRoles (naldLicenceRoles, naldAddresses, naldParties) {
  return naldLicenceRoles.map((naldLicenceRole) => {
    const { ACON_AADD_ID: addressId, ACON_APAR_ID: partyId, FGAC_REGION_CODE: regionCode } = naldLicenceRole

    const matchingAddress = _matchAddressForRole(addressId, regionCode, naldAddresses)
    const addressExternalId = `${matchingAddress.FGAC_REGION_CODE}:${matchingAddress.ID}`

    const matchingNaldParty = _matchPartyForRole(partyId, regionCode, naldParties)
    const partyExternalId = `${matchingNaldParty.FGAC_REGION_CODE}:${matchingNaldParty.ID}`

    return {
      role: 'returnsTo',
      startDate: DateHelpers.mapNaldDate(naldLicenceRole.EFF_ST_DATE),
      endDate: DateHelpers.mapNaldDate(naldLicenceRole.EFF_END_DATE),
      companyExternalId: partyExternalId,
      contactExternalId: matchingNaldParty.APAR_TYPE === 'PER' ? partyExternalId : null,
      addressExternalId
    }
  })
}

function _licenceHolderRoles (document, naldLicenceVersions, naldAddresses, naldParties) {
  const licenceVersionsToUse = naldLicenceVersions.filter((naldLicenceVersion) => {
    return !isLicenceVersionReplaced(naldLicenceVersion, naldLicenceVersions)
  })

  return licenceVersionsToUse.map((licenceVersion) => {
    const { ACON_AADD_ID: addressId, ACON_APAR_ID: partyId, FGAC_REGION_CODE: regionCode } = licenceVersion

    const matchingAddress = _matchAddressForRole(addressId, regionCode, naldAddresses)
    const addressExternalId = `${matchingAddress.FGAC_REGION_CODE}:${matchingAddress.ID}`

    const matchingNaldParty = _matchPartyForRole(partyId, regionCode, naldParties)
    const partyExternalId = `${matchingNaldParty.FGAC_REGION_CODE}:${matchingNaldParty.ID}`

    return {
      role: 'licenceHolder',
      startDate: DateHelpers.getMaxDate([document.startDate, DateHelpers.mapNaldDate(licenceVersion.EFF_ST_DATE)]),
      endDate: DateHelpers.getMinDate([document.endDate, DateHelpers.mapNaldDate(licenceVersion.EFF_END_DATE)]),
      companyExternalId: partyExternalId,
      contactExternalId: matchingNaldParty.APAR_TYPE === 'PER' ? partyExternalId : null,
      addressExternalId
    }
  })
}

function _document (licence) {
  const { endDate, externalId, licenceNumber: documentRef, startDate } = licence

  return {
    documentRef,
    startDate,
    endDate,
    externalId
  }
}

function _licenceVersionPurposeConditions (naldLicenceVersionPurposeConditions) {
  return naldLicenceVersionPurposeConditions.map((condition) => {
    return {
      code: condition.ACIN_CODE,
      subcode: condition.ACIN_SUBCODE,
      param1: _null(condition.PARAM1),
      param2: _null(condition.PARAM2),
      notes: _null(condition.TEXT),
      purposeExternalId: `${condition.FGAC_REGION_CODE}:${condition.AABP_ID}`,
      externalId: `${condition.ID}:${condition.FGAC_REGION_CODE}:${condition.AABP_ID}`
    }
  })
}

function _licenceVersionPurposes (naldLicenceVersionPurposes) {
  return naldLicenceVersionPurposes.map((naldLicenceVersionPurpose) => {
    // NOTE: For those that haven't seen it before + before a variable is known as Unary plus
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unary_plus
    //
    // In this context it is being used to convert the value to a number. We've left it as found because the docs state
    //
    // > unary plus is the fastest and preferred way of converting something into a number, because it does not perform
    // > any other operations on the number.
    const instantQuantity = _null(naldLicenceVersionPurpose.INST_QTY)
    const hourlyQuantity = _null(naldLicenceVersionPurpose.HOURLY_QTY)
    const dailyQuantity = _null(naldLicenceVersionPurpose.DAILY_QTY)
    const annualQuantity = _null(naldLicenceVersionPurpose.ANNUAL_QTY)

    return {
      issue: +naldLicenceVersionPurpose.AABV_ISSUE_NO,
      increment: +naldLicenceVersionPurpose.AABV_INCR_NO,
      purposePrimary: naldLicenceVersionPurpose.APUR_APPR_CODE,
      purposeSecondary: naldLicenceVersionPurpose.APUR_APSE_CODE,
      purposeUse: naldLicenceVersionPurpose.APUR_APUS_CODE,
      abstractionPeriodStartDay: +naldLicenceVersionPurpose.PERIOD_ST_DAY,
      abstractionPeriodStartMonth: +naldLicenceVersionPurpose.PERIOD_ST_MONTH,
      abstractionPeriodEndDay: +naldLicenceVersionPurpose.PERIOD_END_DAY,
      abstractionPeriodEndMonth: +naldLicenceVersionPurpose.PERIOD_END_MONTH,
      timeLimitedStartDate: DateHelpers.mapNaldDate(naldLicenceVersionPurpose.TIMELTD_ST_DATE),
      timeLimitedEndDate: DateHelpers.mapNaldDate(naldLicenceVersionPurpose.TIMELTD_END_DATE),
      notes: _null(naldLicenceVersionPurpose.NOTES),
      instantQuantity: instantQuantity ? +instantQuantity : null,
      hourlyQuantity: hourlyQuantity ? +hourlyQuantity : null,
      dailyQuantity: dailyQuantity ? +dailyQuantity : null,
      annualQuantity: annualQuantity ? +annualQuantity : null,
      externalId: `${naldLicenceVersionPurpose.FGAC_REGION_CODE}:${naldLicenceVersionPurpose.ID}`
    }
  })
}

function _endDates (licence) {
  const rawEndDates = [
    licence.EXPIRY_DATE,
    licence.REV_DATE,
    licence.LAPSED_DATE
  ]

  const nulledEndDates = rawEndDates.map((rawEndDate) => {
    return _null(rawEndDate)
  })

  const filteredEndDates = nulledEndDates.map((nulledEndDate) => {
    return nulledEndDate
  })

  const mappedEndDates = filteredEndDates.map((filteredEndDate) => {
    return DateHelpers.mapNaldDate(filteredEndDate)
  })

  return mappedEndDates
}

function _startDate (naldLicence, naldLicenceVersions) {
  if (naldLicence.ORIG_EFF_DATE !== 'null') {
    return DateHelpers.mapNaldDate(naldLicence.ORIG_EFF_DATE)
  }

  const licenceVersionStartDates = naldLicenceVersions.map((naldLicenceVersion) => {
    return _null(naldLicenceVersion.EFF_ST_DATE)
  })

  const sortedLicenceVersionStartDates = licenceVersionStartDates.sort()

  // Return the earliest
  return DateHelpers.mapNaldDate(sortedLicenceVersionStartDates[0])
}

function _licence (naldLicence, naldLicenceVersions) {
  const endDates = _endDates(naldLicence)
  const startDate = _startDate(naldLicence, naldLicenceVersions)

  return {
    licenceNumber: naldLicence.LIC_NO,
    startDate,
    endDate: DateHelpers.getMinDate(endDates),
    externalId: `${naldLicence.FGAC_REGION_CODE}:${naldLicence.ID}`,
    isWaterUndertaker: naldLicence.AREP_EIUC_CODE.endsWith('SWC'),
    regions: _regions(naldLicence),
    regionCode: parseInt(naldLicence.FGAC_REGION_CODE, 10),
    expiredDate: DateHelpers.mapNaldDate(naldLicence.EXPIRY_DATE),
    lapsedDate: DateHelpers.mapNaldDate(naldLicence.LAPSED_DATE),
    revokedDate: DateHelpers.mapNaldDate(naldLicence.REV_DATE)
  }
}

function _regions (naldLicence) {
  const regionPrefix = naldLicence.AREP_EIUC_CODE.substr(0, 2)

  return {
    historicalAreaCode: naldLicence.AREP_AREA_CODE,
    regionalChargeArea: REGIONS[regionPrefix],
    standardUnitChargeCode: naldLicence.AREP_SUC_CODE,
    localEnvironmentAgencyPlanCode: naldLicence.AREP_LEAP_CODE
  }
}

function _null (value) {
  if (value !== 'null') {
    return value
  }

  return null
}

module.exports = {
  go
}
