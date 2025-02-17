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
