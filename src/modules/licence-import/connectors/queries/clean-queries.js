'use strict'

const cleanChargeElements = `
  WITH licences_to_remove AS (
    SELECT l.id AS licence_id
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.charge_elements ce
  WHERE ce.id IN (
    SELECT ce.id FROM public.charge_elements ce
      INNER JOIN public.charge_references cr
        ON ce.charge_reference_id = cr.id
      INNER JOIN public.charge_versions cv
        ON cr.charge_version_id = cv.id
      INNER JOIN licences_to_remove ltr
        ON cv.licence_id = ltr.licence_id
  );
`

const cleanChargeReferences = `
  WITH licences_to_remove AS (
    SELECT l.id AS licence_id
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.charge_references cr
  WHERE cr.id IN (
    SELECT cr.id FROM public.charge_references cr
      INNER JOIN public.charge_versions cv
        ON cr.charge_version_id = cv.id
      INNER JOIN licences_to_remove ltr
        ON cv.licence_id = ltr.licence_id
  );
`

const cleanChargeVersionNotes = `
  WITH licences_to_remove AS (
    SELECT l.id AS licence_id
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.charge_version_notes cvn
  WHERE cvn.id IN (
    SELECT cv.note_id FROM public.charge_versions cv
      INNER JOIN licences_to_remove ltr
        ON cv.licence_id = ltr.licence_id
  );
`

const cleanChargeVersions = `
  WITH licences_to_remove AS (
    SELECT l.id AS licence_id
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.charge_versions cv
  WHERE cv.licence_id IN (SELECT ltr.licence_id FROM licences_to_remove ltr);
`

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

const cleanLicenceAgreements = `
  WITH licences_to_remove AS (
    SELECT l.licence_ref
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.licence_agreements la
  WHERE la.licence_ref IN (SELECT ltr.licence_ref FROM licences_to_remove ltr);
`

const cleanLicenceDocumentHeaders = `
  WITH licences_to_remove AS (
    SELECT l.licence_ref
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.licence_document_headers ldh
  WHERE ldh.licence_ref IN (SELECT ltr.licence_ref FROM licences_to_remove ltr);
`

const cleanLicenceDocumentRoles = `
  WITH licences_to_remove AS (
    SELECT l.licence_ref
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.licence_document_roles ldr
  WHERE ldr.licence_document_id IN (
    SELECT ld.id FROM public.licence_documents ld
      INNER JOIN licences_to_remove ltr
        ON ld.licence_ref = ltr.licence_ref
  );
`

const cleanLicenceDocuments = `
  WITH licences_to_remove AS (
    SELECT l.licence_ref
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.licence_documents ld
  WHERE ld.licence_ref IN (SELECT ltr.licence_ref FROM licences_to_remove ltr);
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

const cleanLicences = `
DELETE FROM public.licences l
WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id);
`

const cleanLicenceVersions = `
  WITH nald_licence_versions AS (
    SELECT CONCAT_WS(':', nalv."FGAC_REGION_CODE", nalv."AABL_ID", nalv."ISSUE_NO", nalv."INCR_NO") AS nald_id
    FROM "import"."NALD_ABS_LIC_VERSIONS" nalv
  )
  DELETE FROM public.licence_versions lv
    WHERE NOT EXISTS (
      SELECT 1
      FROM nald_licence_versions nlv
      WHERE lv.external_id = nlv.nald_id
    );
`

const cleanLicenceVersionPurposes = `
  WITH nald_licence_version_purposes AS (
    SELECT CONCAT(nalp."FGAC_REGION_CODE", ':', nalp."ID") AS nald_id
    FROM "import"."NALD_ABS_LIC_PURPOSES" nalp
  )
  DELETE FROM public.licence_version_purposes lvp
    WHERE NOT EXISTS (
      SELECT 1
      FROM nald_licence_version_purposes nlvp
      WHERE lvp.external_id = nlvp.nald_id
    );
`

const cleanLicenceVersionPurposeConditions = `
  WITH nald_licence_version_purpose_conditions AS (
    SELECT CONCAT_WS(':', nlc."ID", nlc."FGAC_REGION_CODE", nlc."AABP_ID") AS nald_id
    FROM "import"."NALD_LIC_CONDITIONS" nlc
  )
  DELETE FROM public.licence_version_purpose_conditions lvpc
    WHERE NOT EXISTS (
      SELECT 1
      FROM nald_licence_version_purpose_conditions nlvpc
      WHERE lvpc.external_id = nlvpc.nald_id
    );
`

const cleanLicenceVersionPurposePoints = `
  WITH nald_licence_version_purposes AS (
    SELECT CONCAT(nalp."FGAC_REGION_CODE", ':', nalp."ID") AS nald_id
    FROM "import"."NALD_ABS_LIC_PURPOSES" nalp
  )
  DELETE FROM public.licence_version_purpose_points lvpp
  WHERE lvpp.licence_version_purpose_id IN (
    SELECT lvp.id FROM public.licence_version_purposes lvp
    WHERE NOT EXISTS (
      SELECT 1
      FROM nald_licence_version_purposes nlvp
      WHERE lvp.external_id = nlvp.nald_id
    )
  );
`

const cleanPermitLicences = `
  WITH licences_to_remove AS (
    SELECT l.licence_ref
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.permit_licences pl
  WHERE pl.licence_ref IN (SELECT ltr.licence_ref FROM licences_to_remove ltr);
`

const cleanWorkflows = `
  WITH nald_licence_versions AS (
    SELECT CONCAT_WS(':', nalv."FGAC_REGION_CODE", nalv."AABL_ID", nalv."ISSUE_NO", nalv."INCR_NO") AS nald_id
    FROM "import"."NALD_ABS_LIC_VERSIONS" nalv
  ),
  licences_to_remove AS (
    SELECT l.id AS licence_id
    FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
  )
  DELETE FROM public.workflows w
  WHERE w.licence_version_id IN (
    SELECT lv.id FROM public.licence_versions lv
    WHERE NOT EXISTS (
      SELECT 1
      FROM nald_licence_versions nlv
      WHERE lv.external_id = nlv.nald_id
    )
  )
  OR w.licence_id IN (SELECT ltr.licence_id FROM licences_to_remove ltr);
`

module.exports = {
  cleanChargeElements,
  cleanChargeReferences,
  cleanChargeVersionNotes,
  cleanChargeVersions,
  cleanCrmV2Documents,
  cleanLicenceAgreements,
  cleanLicenceDocumentHeaders,
  cleanLicenceDocumentRoles,
  cleanLicenceDocuments,
  cleanLicenceMonitoringStations,
  cleanLicences,
  cleanLicenceVersions,
  cleanLicenceVersionPurposes,
  cleanLicenceVersionPurposeConditions,
  cleanLicenceVersionPurposePoints,
  cleanPermitLicences,
  cleanWorkflows
}
