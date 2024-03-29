'use strict'

const common = require('./common')

const getNextId = require('./next-id.js')

class ReturnFormat {
  constructor () {
    this.id = getNextId()
    this.points = []
    this.purposes = []
  }

  setLicence (licence) {
    this.licence = licence
    return this
  }

  setReturnVersion (returnVersion) {
    this.returnVersion = returnVersion
    return this
  }

  addPoint (point) {
    point.setFormat(this)
    this.points.push(point)
    return this
  }

  addPurpose (purpose) {
    purpose.setFormat(this)
    this.purposes.push(purpose)
    return this
  }

  getAbstractionPeriod () {
    return {
      ABS_PERIOD_START_DAY: '1',
      ABS_PERIOD_START_MONTH: '1',
      ABS_PERIOD_END_DAY: '31',
      ABS_PERIOD_END_MONTH: '12',
      TIMELTD_ST_DATE: null,
      TIMELTD_END_DATE: null
    }
  }

  export () {
    return {
      ID: this.id,
      ARVN_AABL_ID: this.licence.id,
      ARVN_VERS_NO: this.returnVersion.getVersionNumber(),
      RETURN_FORM_TYPE: 'M',
      ARTC_CODE: 'M',
      ARTC_RET_FREQ_CODE: 'A',
      FORMS_REQ_ALL_YEAR: 'Y',
      FORM_PRODN_MONTH: '80',
      NO_OF_DAYS_GRACE: '14',
      TPT_FLAG: 'N',
      ...this.getAbstractionPeriod(),
      DISP_ORD: null,
      SITE_DESCR: 'The well on the hill under the tree',
      DESCR: '1000 CMA',
      ANNUAL_QTY: null,
      ANNUAL_QTY_USABILITY: null,
      CC_IND: null,
      ...common.getCommonObject('FGAC_REGION_CODE', 'SOURCE_CODE', 'BATCH_RUN_DATE')
    }
  }
}

module.exports = ReturnFormat
