'use strict'

const db = require('../../../lib/connectors/db.js')
const Fetcher = require('./fetcher.js')
const Transformer = require('./transformer.js')

async function go (naldLicence) {
  const { LIC_NO: licenceRef } = naldLicence

  try {
    const {
      licencePriorToImport,
      naldAddresses,
      naldLicenceRoles,
      naldLicenceVersions,
      naldLicenceVersionPurposes,
      naldLicenceVersionPurposeConditions,
      naldParties
    } = await Fetcher.go(naldLicence)

    const transformedLicenceData = Transformer.go(
      naldAddresses,
      naldLicence,
      naldLicenceRoles,
      naldLicenceVersions,
      naldLicenceVersionPurposes,
      naldLicenceVersionPurposeConditions,
      naldParties
    )

    let results = await _persistDocument(transformedLicenceData.document)
    await _persistDocumentRoles(transformedLicenceData.documentRoles, results[0].document_id)

    results = await _persistLicence(transformedLicenceData.licence)
    await _flagForSupplementary(licencePriorToImport, transformedLicenceData.licence, results[0].licence_id)

    await _persistLicenceVersions(transformedLicenceData.licenceVersions, results[0].licence_id)
    await _persistLicenceVersionPurposes(
      transformedLicenceData.licenceVersionPurposes,
      transformedLicenceData.licenceVersions
    )
    await _persistLicenceVersionPurposeConditions(
      transformedLicenceData.licenceVersionPurposeConditions,
      transformedLicenceData.licenceVersionPurposes
    )
  } catch (error) {
    global.GlobalNotifier.omfg('licence-details.import errored', error, { licenceRef })
    throw error
  }
}

async function _persistLicenceVersionPurposeCondition (licenceVersionPurposeCondition, licenceVersionPurposeId) {
  const params = [
    licenceVersionPurposeId,
    licenceVersionPurposeCondition.code,
    licenceVersionPurposeCondition.subcode,
    licenceVersionPurposeCondition.param1,
    licenceVersionPurposeCondition.param2,
    licenceVersionPurposeCondition.notes,
    licenceVersionPurposeCondition.externalId
  ]
  const query = `
    INSERT INTO water.licence_version_purpose_conditions (
      licence_version_purpose_id,
      licence_version_purpose_condition_type_id,
      param_1,
      param_2,
      notes,
      external_id,
      date_created,
      date_updated
    )
    VALUES (
      $1,
      (
        SELECT
          licence_version_purpose_condition_type_id
        FROM
          water.licence_version_purpose_condition_types
        WHERE
          code = $2
          AND subcode = $3
      ),
      $4,
      $5,
      $6,
      $7,
      now(),
      now()
    )
    ON CONFLICT (external_id)
    DO UPDATE
    SET
      licence_version_purpose_condition_type_id = excluded.licence_version_purpose_condition_type_id,
      param_1 = excluded.param_1,
      param_2 = excluded.param_2,
      notes = excluded.notes,
      date_updated = now();
  `

  return db.query(query, params)
}

async function _persistLicenceVersionPurposeConditions (licenceVersionPurposeConditions, licenceVersionPurposes) {
  for (const licenceVersionPurposeCondition of licenceVersionPurposeConditions) {
    const matchingLicenceVersionPurpose = licenceVersionPurposes.find((licenceVersionPurpose) => {
      return licenceVersionPurpose.externalId === licenceVersionPurposeCondition.purposeExternalId
    })

    if (!matchingLicenceVersionPurpose) {
      throw new Error('Cannot match licence version purpose condition to licence version purpose')
    }

    const { licenceVersionPurposeId } = matchingLicenceVersionPurpose
    await _persistLicenceVersionPurposeCondition(licenceVersionPurposeCondition, licenceVersionPurposeId)
  }
}

async function _persistLicenceVersionPurpose (licenceVersionPurpose, licenceVersionId) {
  const params = [
    licenceVersionId,
    licenceVersionPurpose.purposePrimary,
    licenceVersionPurpose.purposeSecondary,
    licenceVersionPurpose.purposeUse,
    licenceVersionPurpose.abstractionPeriodStartDay,
    licenceVersionPurpose.abstractionPeriodStartMonth,
    licenceVersionPurpose.abstractionPeriodEndDay,
    licenceVersionPurpose.abstractionPeriodEndMonth,
    licenceVersionPurpose.timeLimitedStartDate,
    licenceVersionPurpose.timeLimitedEndDate,
    licenceVersionPurpose.notes,
    licenceVersionPurpose.instantQuantity,
    licenceVersionPurpose.hourlyQuantity,
    licenceVersionPurpose.dailyQuantity,
    licenceVersionPurpose.annualQuantity,
    licenceVersionPurpose.externalId
  ]
  const query = `
    INSERT INTO water.licence_version_purposes (
      licence_version_id,
      purpose_primary_id,
      purpose_secondary_id,
      purpose_use_id,
      abstraction_period_start_day,
      abstraction_period_start_month,
      abstraction_period_end_day,
      abstraction_period_end_month,
      time_limited_start_date,
      time_limited_end_date,
      notes,
      instant_quantity,
      hourly_quantity,
      daily_quantity,
      annual_quantity,
      external_id,
      date_created,
      date_updated
    )
    VALUES (
      $1,
      (
        SELECT
          purpose_primary_id
        FROM
          water.purposes_primary
        WHERE
          legacy_id = $2
      ),
      (
      SELECT
        purpose_secondary_id
      FROM
        water.purposes_secondary
      WHERE
        legacy_id = $3
      ),
      (
      SELECT
        purpose_use_id
      FROM
        water.purposes_uses
      WHERE
        legacy_id = $4
      ),
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16,
      now(),
      now()
    )
    ON CONFLICT (external_id)
    DO UPDATE
    SET
      purpose_primary_id = excluded.purpose_primary_id,
      purpose_secondary_id = excluded.purpose_secondary_id,
      purpose_use_id = excluded.purpose_use_id,
      abstraction_period_start_day = excluded.abstraction_period_start_day,
      abstraction_period_start_month = excluded.abstraction_period_start_month,
      abstraction_period_end_day = excluded.abstraction_period_end_day,
      abstraction_period_end_month = excluded.abstraction_period_end_month,
      time_limited_start_date = excluded.time_limited_start_date,
      time_limited_end_date = excluded.time_limited_end_date,
      notes = excluded.notes,
      instant_quantity = excluded.instant_quantity,
      hourly_quantity = excluded.hourly_quantity,
      daily_quantity = excluded.daily_quantity,
      annual_quantity = excluded.annual_quantity,
      date_updated = now()
    RETURNING licence_version_purpose_id;
  `

  return db.query(query, params)
}

async function _persistLicenceVersionPurposes (licenceVersionPurposes, licenceVersions) {
  for (const licenceVersionPurpose of licenceVersionPurposes) {
    const matchingLicenceVersion = licenceVersions.find((licenceVersion) => {
      const { issue, increment } = licenceVersion

      return licenceVersionPurpose.issue === issue && licenceVersionPurpose.increment === increment
    })

    if (!matchingLicenceVersion) {
      throw new Error('Cannot match licence version purpose to licence version')
    }

    const { licenceVersionId } = matchingLicenceVersion
    const results = await _persistLicenceVersionPurpose(licenceVersionPurpose, licenceVersionId)

    licenceVersionPurpose.licenceVersionPurposeId = results[0].licence_version_purpose_id
  }
}

async function _persistLicenceVersion (licenceVersion, licenceId) {
  const params = [
    licenceId,
    licenceVersion.issue,
    licenceVersion.increment,
    licenceVersion.status,
    licenceVersion.startDate,
    licenceVersion.endDate,
    licenceVersion.externalId
  ]
  const query = `
    INSERT INTO water.licence_versions (
      licence_id,
      issue,
      "increment",
      status,
      start_date,
      end_date,
      external_id,
      date_created,
      date_updated
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      now(),
      now()
    )
    ON CONFLICT (external_id)
    DO UPDATE
    SET
      licence_id = excluded.licence_id,
      status = excluded.status,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      date_updated = now()
    RETURNING licence_version_id;
  `

  return db.query(query, params)
}

async function _persistLicenceVersions (licenceVersions, licenceId) {
  for (const licenceVersion of licenceVersions) {
    const results = await _persistLicenceVersion(licenceVersion, licenceId)

    licenceVersion.licenceVersionId = results[0].licence_version_id
  }
}

async function _persistLicence (licence) {
  const params = [
    licence.regionCode,
    licence.licenceNumber,
    licence.isWaterUndertaker,
    licence.regions,
    licence.startDate,
    licence.expiredDate,
    licence.lapsedDate,
    licence.revokedDate
  ]
  const query = `
    INSERT INTO water.licences (
      region_id,
      licence_ref,
      is_water_undertaker,
      regions,
      start_date,
      expired_date,
      lapsed_date,
      revoked_date
    )
    VALUES (
      (
        SELECT
          region_id
        FROM
          water.regions
        WHERE
          nald_region_id = $1
      ),
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8
    )
    ON CONFLICT (licence_ref)
    DO UPDATE
    SET
      is_water_undertaker = excluded.is_water_undertaker,
      regions = excluded.regions,
      start_date = excluded.start_date,
      expired_date = excluded.expired_date,
      lapsed_date = excluded.lapsed_date,
      revoked_date = excluded.revoked_date,
      date_updated = now()
    RETURNING licence_id;
  `

  return db.query(query, params)
}

async function _persistDocumentRoles (documentRoles, documentId) {
  for (const documentRole of documentRoles) {
    await _persistDocumentRole(documentRole, documentId)
  }
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
    DO UPDATE
    SET
      company_id = EXCLUDED.company_id,
      contact_id = EXCLUDED.contact_id,
      address_id = EXCLUDED.address_id,
      end_date = EXCLUDED.end_date,
      date_updated = EXCLUDED.date_updated;
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
      date_updated,
      date_deleted
    )
    VALUES (
      'water',
      'abstraction_licence',
      $1,
      $2,
      $3,
      $4,
      NOW(),
      NOW(),
      NULL
    )
    ON CONFLICT (
      regime,
      document_type,
      document_ref
      )
    DO UPDATE
    SET
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      external_id = EXCLUDED.external_id,
      date_updated = EXCLUDED.date_updated,
      date_deleted = EXCLUDED.date_deleted
    RETURNING document_id;
  `

  return db.query(query, params)
}

function _flagForSupplementary (licencePriorToImport, licence, licenceId) {
  const {
    expired_date: priorExpiredDate,
    lapsed_date: priorLapsedDate,
    revoked_date: priorRevokedDate
  } = licencePriorToImport

  const { expiredDate, lapsedDate, revokedDate } = licence

  const expiredNotChanged = priorExpiredDate === expiredDate
  const lapsedNotChanged = priorLapsedDate === lapsedDate
  const revokedNotChanged = priorRevokedDate === revokedDate

  if (expiredNotChanged && lapsedNotChanged && revokedNotChanged) {
    return
  }

  // Only update the appropriate scheme's flag depending on what the licence is linked to; if both flag both, just got
  // charge versions for one scheme then flag only it, else has no charge versions then do not flag at all.
  // This updates the query to handle new SROC billing plus fixes an old problem of licences with no charge versions
  // were getting flagged (with no charge versions they can't be billed and the flag then cleared).
  const query = `
    UPDATE water.licences l SET
      include_in_supplementary_billing = CASE
        WHEN EXISTS (
          SELECT
            1
          FROM
            water.charge_versions cv
          WHERE
            cv.licence_id = l.licence_id
            AND cv.start_date < '2022-04-01'::Date
        ) THEN 'yes'
        ELSE include_in_supplementary_billing
      END,
      include_in_sroc_supplementary_billing = CASE
        WHEN EXISTS (
          SELECT
            1
          FROM
            water.charge_versions cv
          WHERE
            cv.licence_id = l.licence_id
            AND cv.start_date >= '2022-04-01'::Date
        ) THEN TRUE
        ELSE include_in_sroc_supplementary_billing
      END
    WHERE
      l.licence_id = $1;
  `

  return db.query(query, [licenceId])
}

module.exports = {
  go
}
