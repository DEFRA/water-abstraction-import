'use strict'

const cleanCrmV2Documents = `
  update crm_v2.documents
  set date_deleted = now()
  where document_ref not in (
    select l."LIC_NO"
    from import."NALD_ABS_LICENCES" l
  )
  and date_deleted is null
  and regime = 'water'
  and document_type = 'abstraction_licence';
`

const cleanLicenceMonitoringStations = `
  WITH nald_licence_version_purpose_conditions AS (
    SELECT CONCAT_WS(':', nlc."ID", nlc."FGAC_REGION_CODE", nlc."AABP_ID") AS nald_id
    FROM "import"."NALD_LIC_CONDITIONS" nlc
  )
  DELETE FROM public.licence_monitoring_stations lms
  WHERE lms.licence_version_purpose_condition_id IN (
    SELECT lvpc.id FROM public.licence_version_purpose_conditions lvpc
    WHERE NOT EXISTS (
    SELECT 1
    FROM nald_licence_version_purpose_conditions nlvpc
    WHERE lvpc.external_id = nlvpc.nald_id
    )
  );
`

module.exports = {
  cleanCrmV2Documents,
  cleanLicenceMonitoringStations
}
