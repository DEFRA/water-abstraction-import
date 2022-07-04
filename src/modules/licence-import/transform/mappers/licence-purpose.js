'use strict'

const dateMapper = require('./date')
const nald = require('@envage/water-abstraction-helpers').nald

const mapLicencePurpose = data => {
  const purpose = {
    issue: +data.AABV_ISSUE_NO,
    increment: +data.AABV_INCR_NO,
    purposePrimary: data.APUR_APPR_CODE,
    purposeSecondary: data.APUR_APSE_CODE,
    purposeUse: data.APUR_APUS_CODE,
    abstractionPeriodStartDay: +data.PERIOD_ST_DAY,
    abstractionPeriodStartMonth: +data.PERIOD_ST_MONTH,
    abstractionPeriodEndDay: +data.PERIOD_END_DAY,
    abstractionPeriodEndMonth: +data.PERIOD_END_MONTH,
    timeLimitedStartDate: dateMapper.mapNaldDate(data.TIMELTD_ST_DATE),
    timeLimitedEndDate: dateMapper.mapNaldDate(data.TIMELTD_END_DATE),
    notes: nald.stringNullToNull(data.NOTES),
    annualQuantity: nald.stringNullToNull(data.ANNUAL_QTY) === null
      ? null
      : +data.ANNUAL_QTY,
    externalId: `${data.FGAC_REGION_CODE}:${data.ID}`
  }

  return purpose
}

module.exports = {
  mapLicencePurpose
}
