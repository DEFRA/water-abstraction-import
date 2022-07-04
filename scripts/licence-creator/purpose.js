'use strict'

const getNextId = require('./next-id.js')
const common = require('./common')

class Purpose {
  constructor () {
    this.id = getNextId()

    this.licence = null

    this.primary = null
    this.secondary = null
    this.tertiary = null

    this.periodStartDay = 1
    this.periodStartMonth = 3
    this.periodEndDay = 30
    this.periodEndMonth = 9

    this.annualQty = 105000
    this.dailyQty = 15.2
    this.hourlyQty = 3.5
    this.instantQty = 0.15

    this.conditions = []
    this.agreements = []
    this.purposePoints = []
  }

  setLicence (licence) {
    this.licence = licence
    return this
  }

  setPrimaryPurpose (primaryPurpose) {
    this.primary = primaryPurpose
    return this
  }

  setSecondaryPurpose (secondaryPurpose) {
    this.secondary = secondaryPurpose
    return this
  }

  setTertiaryPurpose (tertiaryPurpose) {
    this.tertiary = tertiaryPurpose
    return this
  }

  addCondition (condition) {
    this.conditions.push(condition)
    condition.setPurpose(this)
    return this
  }

  addAggreement (agreement) {
    this.agreements.push(agreement)
    agreement.setPurpose(this)
    return this
  }

  addPurposePoint (purposePoint) {
    this.purposePoints.push(purposePoint)
    purposePoint.setPurpose(this)
    return this
  }

  getQuantities () {
    return {
      ANNUAL_QTY: this.annualQty,
      ANNUAL_QTY_USABILITY: 'L',
      DAILY_QTY: this.dailyQty,
      DAILY_QTY_USABILITY: 'L',
      HOURLY_QTY: this.hourlyQty,
      HOURLY_QTY_USABILITY: 'L',
      INST_QTY: this.instantQty,
      INST_QTY_USABILITY: 'L'
    }
  }

  getPurposeCodes () {
    return {
      APUR_APPR_CODE: this.primary.code,
      APUR_APSE_CODE: this.secondary.code,
      APUR_APUS_CODE: this.tertiary.code
    }
  }

  getTimePeriod () {
    return {
      PERIOD_ST_DAY: this.periodStartDay,
      PERIOD_ST_MONTH: this.periodStartMonth,
      PERIOD_END_DAY: this.periodEndDay,
      PERIOD_END_MONTH: this.periodEndMonth
    }
  }

  export () {
    return {
      ID: this.id,
      AABV_AABL_ID: this.licence.id,
      AABV_ISSUE_NO: 100,
      AABV_INCR_NO: 0,
      ...this.getPurposeCodes(),
      ...this.getTimePeriod(),
      AMOM_CODE: 'PRT',
      ...this.getQuantities(),
      ...common.createNullKeys('TIMELTD_START_DATE', 'LANDS', 'AREC_CODE', 'DISP_ORD'),
      NOTES: 'Licence notes here, could include long NGR code SJ 1234 5678',
      ...common.getCommonObject('FGAC_REGION_CODE', 'SOURCE_CODE', 'BATCH_RUN_DATE')
    }
  }
}

module.exports = Purpose
