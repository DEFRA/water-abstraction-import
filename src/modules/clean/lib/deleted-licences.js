'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await _chargeElements()
  await _chargeVersionNotes()
  await _licenceAgreements()
  await _licenceDocumentHeaders()
  await _licenceDocumentRoles()
  await _licenceMonitoringStations()
  await _licenceVersionPurposePoints()
  await _licenceWorkflows()
  await _permitLicences()
  await _licenceVersionPurposeConditions()
  await _licenceVersionPurposes()
  await _licenceVersions()
  await _chargeReferences()
  await _billingVolumes()
  await _billingBatchChargeVersionYears()
  await _chargeVersions()
  await _licenceDocuments()
  await _licences()
}

async function _billingBatchChargeVersionYears() {
  // Delete any billing batch charge version years linked to charge versions linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM water.billing_batch_charge_version_years bbcvy
    WHERE bbcvy.charge_version_id IN (
      SELECT cv.id FROM public.charge_versions cv
        INNER JOIN licences_to_remove ltr
          ON cv.licence_id = ltr.licence_id
    );
  `)
}

async function _billingVolumes() {
  // Delete any billing volumes linked to charge elements linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM water.billing_volumes bv
    WHERE bv.charge_element_id  IN (
      SELECT ce.charge_element_id FROM water.charge_elements ce
        INNER JOIN water.charge_versions cv
          ON ce.charge_version_id = cv.charge_version_id
        INNER JOIN licences_to_remove ltr
          ON cv.licence_id = ltr.licence_id
    );
  `)
}

async function _chargeElements () {
  // Delete any charge elements linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
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
  `)
}

async function _chargeReferences () {
  // Delete any charge references linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.charge_references cr
    WHERE cr.id IN (
      SELECT cr.id FROM public.charge_references cr
        INNER JOIN public.charge_versions cv
          ON cr.charge_version_id = cv.id
        INNER JOIN licences_to_remove ltr
          ON cv.licence_id = ltr.licence_id
    );
  `)
}

async function _chargeVersionNotes () {
  // Delete any charge version notes linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.charge_version_notes cvn
    WHERE cvn.id IN (
      SELECT cv.note_id FROM public.charge_versions cv
        INNER JOIN licences_to_remove ltr
          ON cv.licence_id = ltr.licence_id
    );
  `)
}

async function _chargeVersions () {
  // Delete any charge versions linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.charge_versions cv
    WHERE cv.licence_id IN (SELECT ltr.licence_id FROM licences_to_remove ltr);
  `)
}

async function _licenceAgreements () {
  // Delete any licence agreements linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.licence_ref
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_agreements la
    WHERE la.licence_ref IN (SELECT ltr.licence_ref FROM licences_to_remove ltr);
  `)
}

async function _licenceDocumentHeaders () {
  // Delete any licence document headers linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.licence_ref
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_document_headers ldh
    WHERE ldh.licence_ref IN (SELECT ltr.licence_ref FROM licences_to_remove ltr);
  `)
}

async function _licenceDocumentRoles () {
  // Delete any licence document roles linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.licence_ref
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_document_roles ldr
    WHERE ldr.licence_document_id IN (
      SELECT ld.id FROM public.licence_documents ld
        INNER JOIN licences_to_remove ltr
          ON ld.licence_ref = ltr.licence_ref
    );
  `)
}

async function _licenceDocuments () {
  // Delete any licence documents linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.licence_ref
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_documents ld
    WHERE ld.licence_ref IN (SELECT ltr.licence_ref FROM licences_to_remove ltr);
  `)
}

async function _licenceMonitoringStations () {
  // Delete any licence monitoring stations linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_monitoring_stations lms
    WHERE lms.licence_id IN (SELECT ltr.licence_id FROM licences_to_remove ltr);
  `)
}

async function _licences () {
  // Delete any licences linked to deleted NALD licences
  await db.query(`
    DELETE FROM public.licences l
    WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
    AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL);
  `)
}

async function _licenceVersionPurposeConditions () {
  // Delete any licence version purpose conditions linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_version_purpose_conditions lvpc
      WHERE lvpc.licence_version_purpose_id IN (
        SELECT lvp.id FROM public.licence_version_purposes lvp
        INNER JOIN public.licence_versions lv
          ON lv.id = lvp.licence_version_id
        INNER JOIN licences_to_remove ltr
          ON ltr.licence_id = lv.licence_id
      );
  `)
}

async function _licenceVersionPurposePoints () {
  // Delete any licence version purpose points linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_version_purpose_points lvpp
    WHERE lvpp.licence_version_purpose_id IN (
      SELECT lvp.id FROM public.licence_version_purposes lvp
      INNER JOIN public.licence_versions lv
        ON lv.id = lvp.licence_version_id
      INNER JOIN licences_to_remove ltr
        ON ltr.licence_id = lv.licence_id
    );
  `)
}

async function _licenceVersionPurposes () {
  // Delete any licence version purposes linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_version_purposes lvp
      WHERE lvp.licence_version_id IN (
        SELECT lv.id from public.licence_versions lv
        INNER JOIN licences_to_remove ltr
          ON ltr.licence_id = lv.licence_id
      );
  `)
}

async function _licenceVersions () {
  // Delete any licence versions linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.licence_versions lv
      WHERE lv.licence_id IN (SELECT ltr.licence_id FROM licences_to_remove ltr);
  `)
}

async function _licenceWorkflows () {
  // Delete any workflows linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.id AS licence_id
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.workflows w
    WHERE w.licence_id IN (SELECT ltr.licence_id FROM licences_to_remove ltr);
  `)
}

async function _permitLicences () {
  // Delete any permit licences linked to deleted NALD licences
  await db.query(`
    WITH licences_to_remove AS (
      SELECT l.licence_ref
      FROM public.licences l
      WHERE NOT EXISTS (SELECT 1 FROM "import"."NALD_ABS_LICENCES" nal WHERE nal."LIC_NO" = l.licence_ref)
      AND NOT EXISTS (SELECT 1 FROM public.bill_licences bl WHERE bl.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.return_versions rv WHERE rv.licence_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM public.licence_document_headers ldh WHERE ldh.licence_ref = l.licence_ref AND ldh.company_entity_id IS NOT NULL)
    )
    DELETE FROM public.permit_licences pl
    WHERE pl.licence_ref IN (SELECT ltr.licence_ref FROM licences_to_remove ltr);
  `)
}

module.exports = {
  go
}
