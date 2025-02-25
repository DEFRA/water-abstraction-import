'use strict'

const CrmV2Transformer = require('./lib/crm-v2-transformer.js')
const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')
const PermitTransformer = require('../licence-permit-import/lib/permit-transformer.js')

async function go(licence, index = 0, log = false) {
  try {
    const startTime = currentTimeInNanoseconds()

    const permitData = await _permitData(licence)

    if (!permitData || permitData.data.versions.length === 0) {
      return null
    }

    const { document, documentRoles } = CrmV2Transformer.go(permitData)
    const documentId = await _persistDocument(document)

    for (const documentRole of documentRoles) {
      await _persistDocumentRole(documentRole, documentId)
    }

    if (log) {
      calculateAndLogTimeTaken(startTime, `licence-crm-v2-import: complete (${index})`)
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-crm-v2-import: errored', error, { licence, index })
  }
}

async function _permitData (licence) {
  if (typeof licence !== 'string') {
    return licence
  }

  let results = await db.query('SELECT l.* FROM "import"."NALD_ABS_LICENCES" l WHERE l."LIC_NO" = $1;', [licence])

  return PermitTransformer.go(results[0])
}

async function _persistDocument (document) {
  const params = [document.documentRef, document.startDate, document.endDate, document.externalId]
  const query = `
    INSERT INTO crm_v2.documents (
      regime,
      document_type,
      document_ref,
      start_date,
      end_date,
      external_id,
      date_created,
      date_updated
    )
    VALUES (
      'water',
      'abstraction_licence',
      $1,
      $2,
      $3,
      $4,
      NOW(),
      NOW()
    )
    ON CONFLICT (
      document_ref
    )
    DO UPDATE SET
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      external_id = EXCLUDED.external_id,
      date_updated = EXCLUDED.date_updated
    RETURNING document_id;
  `

  const results = await db.query(query, params)

  return results[0].document_id
}

async function _persistDocumentRole (documentRole, documentId) {
  const params = [
    documentId,
    documentRole.startDate,
    documentRole.endDate,
    documentRole.companyExternalId,
    documentRole.contactExternalId,
    documentRole.addressExternalId,
    documentRole.role
  ]
  const query = `
    INSERT INTO crm_v2.document_roles (
      document_id,
      role_id,
      company_id,
      contact_id,
      address_id,
      start_date,
      end_date,
      date_created,
      date_updated
    )
    SELECT
      $1,
      r.role_id,
      c.company_id,
      co.contact_id,
      a.address_id,
      $2,
      $3,
      NOW(),
      NOW()
    FROM
      crm_v2.roles r
    LEFT JOIN crm_v2.companies c ON c.external_id = $4
    LEFT JOIN crm_v2.contacts co ON co.external_id = $5
    LEFT JOIN crm_v2.addresses a ON a.external_id = $6
    WHERE
      r.name = $7
    ON CONFLICT (
      document_id,
      role_id,
      start_date
    )
    DO UPDATE SET
      company_id = EXCLUDED.company_id,
      contact_id = EXCLUDED.contact_id,
      address_id = EXCLUDED.address_id,
      end_date = EXCLUDED.end_date,
      date_updated = EXCLUDED.date_updated;
  `

  await db.query(query, params)
}

module.exports = {
  go
}
