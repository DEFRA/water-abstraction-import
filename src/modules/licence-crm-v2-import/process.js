'use strict'

const Transformer = require('./lib/transformer.js')
const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken, timestampForPostgres } = require('../../lib/general.js')

async function go (permitJson, log = false) {
  const messages = []

  try {
    const startTime = currentTimeInNanoseconds()
    const startTimestamp = timestampForPostgres()

    if (!permitJson || permitJson.data.versions.length === 0) {
      global.GlobalNotifier.omg('licence-crm-v2-import: skipped')
      messages.push(`Skipped ${permitJson?.LIC_NO}`)

      return messages
    }

    const { document, documentRoles } = Transformer.go(permitJson)
    const documentId = await _persistDocument(document)

    for (const documentRole of documentRoles) {
      await _persistDocumentRole(documentRole, documentId)
    }

    await _cleanUp(documentId, startTimestamp)

    if (log) {
      calculateAndLogTimeTaken(startTime, 'licence-crm-v2-import: complete')
    }
  } catch (error) {
    global.GlobalNotifier.omfg('licence-crm-v2-import: errored', { licenceRef: permitJson?.LIC_NO }, error)

    messages.push(error.message)
  }

  return messages
}

async function _cleanUp (documentId, startTimestamp) {
  const params = [documentId, startTimestamp]
  const query = `
    DELETE FROM crm_v2.document_roles
    WHERE document_id = $1 AND date_updated < $2;
  `

  return db.query(query, params)
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
