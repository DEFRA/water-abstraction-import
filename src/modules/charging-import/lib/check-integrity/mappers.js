const moment = require('moment');

const mapField = value => value.toString();
const mapNullableField = value => value === null ? 'null' : mapField(value);
const mapDate = date => moment(date).format('DD/MM/YYYY');
const mapNullableDate = date => date === null ? 'null' : mapDate(date);
const mapBoolean = value => {
  if (value === true) {
    return 'Y';
  }
  if (value === false) {
    return 'N';
  }
};

const statuses = {
  draft: 'DRAFT',
  current: 'CURR',
  superseded: 'SUPER'
};
const mapStatus = status => statuses[status];

const mapCode = code => code.substr(0, 1).toUpperCase();

const mapChargeVersion = row => ({
  AABL_ID: mapField(row.external_id),
  VERS_NO: mapField(row.version_number),
  EFF_ST_DATE: mapDate(row.start_date),
  STATUS: mapStatus(row.status),
  APPORTIONMENT: mapBoolean(row.apportionment),
  IN_ERROR_STATUS: mapBoolean(row.error),
  EFF_END_DATE: mapNullableDate(row.end_date),
  BILLED_UPTO_DATE: mapNullableDate(row.billed_upto_date),
  FGAC_REGION_CODE: mapField(row.region_code)
});

const mapChargeElement = row => ({
  ID: mapField(row.external_id),
  ABS_PERIOD_ST_DAY: mapField(row.abstraction_period_start_day),
  ABS_PERIOD_ST_MONTH: mapField(row.abstraction_period_start_month),
  ABS_PERIOD_END_DAY: mapField(row.abstraction_period_end_day),
  ABS_PERIOD_END_MONTH: mapField(row.abstraction_period_end_month),
  AUTH_ANN_QTY: mapField(row.authorised_annual_quantity),
  ASFT_CODE: mapCode(row.season),
  ASFT_CODE_DERIVED: mapCode(row.season_derived),
  ASRF_CODE: mapCode(row.source),
  ALSF_CODE: mapCode(row.loss),
  APUR_APPR_CODE: row.purpose_primary,
  APUR_APSE_CODE: row.purpose_secondary,
  APUR_APUS_CODE: row.purpose_tertiary,
  FCTS_OVERRIDDEN: mapBoolean(row.factors_overridden),
  BILLABLE_ANN_QTY: mapNullableField(row.billable_annual_quantity),
  TIMELTD_ST_DATE: mapNullableDate(row.time_limited_start_date),
  TIMELTD_END_DATE: mapNullableDate(row.time_limited_end_date),
  DESCR: mapNullableField(row.description)

});

const mapChargeAgreement = row => ({
  AFSA_CODE: mapField(row.agreement_code),
  EFF_ST_DATE: mapDate(row.start_date),
  EFF_END_DATE: mapNullableDate(row.end_date),
  SIGNED_DATE: mapNullableDate(row.signed_date),
  FILE_REF: mapNullableField(row.file_reference),
  TEXT: mapNullableField(row.description)
});

exports.mapChargeVersion = mapChargeVersion;
exports.mapChargeElement = mapChargeElement;
exports.mapChargeAgreement = mapChargeAgreement;
