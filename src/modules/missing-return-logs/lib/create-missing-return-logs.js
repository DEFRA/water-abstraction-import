'use strict'

const db = require('../../../lib/connectors/db.js')
const FetchPointsPurposes = require('../../missing-void-returns/lib/fetch-points-purposes.js')
const { formatDateObjectToISO } = require('../../../lib/date-helpers.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (missingReturn, timestamp) {
  const { points, purposes } = await FetchPointsPurposes.go(missingReturn.returnRequirementId)

  for (const returnLog of missingReturn.returnLogs) {
    await _createReturnLog(missingReturn, returnLog, points, purposes, timestamp)
  }
}

function _abstractionPeriodValue (value) {
  return value ? value.toString() : 'null'
}

function _metadata (missingReturn, points, purposes) {
  return {
    description: missingReturn.siteDescription,
    isCurrent: true,
    isFinal: false,
    isSummer: missingReturn.summer,
    isTwoPartTariff: missingReturn.twoPartTariff,
    isUpload: missingReturn.multipleUpload,
    nald: {
      regionCode: missingReturn.regionId,
      areaCode: missingReturn.areaCode,
      formatId: missingReturn.reference,
      periodStartDay: _abstractionPeriodValue(missingReturn.abstractionPeriod.startDay),
      periodStartMonth: _abstractionPeriodValue(missingReturn.abstractionPeriod.startMonth),
      periodEndDay: _abstractionPeriodValue(missingReturn.abstractionPeriod.endDay),
      periodEndMonth: _abstractionPeriodValue(missingReturn.abstractionPeriod.endMonth)
    },
    points: _points(points),
    purposes: _purposes(purposes),
    version: 1
  }
}

function _points (points) {
  return points.map((point) => {
    return {
      name: point.description,
      ngr1: point.ngr_1,
      ngr2: point.ngr_2,
      ngr3: point.ngr_3,
      ngr4: point.ngr_4
    }
  })
}

function _purposes (purposes) {
  return purposes.map((purpose) => {
    const alias = purpose.purpose_alias

    return {
      // NOTE: This is a way of only adding the `alias` property if an alias is set. If one is not set, its not just
      // set to null, instead `alias:` isn't present on the return object
      ...(alias !== null && { alias }),
      primary: {
        code: purpose.primary_legacy_id,
        description: purpose.primary_description
      },
      secondary: {
        code: purpose.secondary_legacy_id,
        description: purpose.secondary_description
      },
      tertiary: {
        code: purpose.tertiary_legacy_id,
        description: purpose.tertiary_description
      }
    }
  })
}

async function _createReturnLog (missingReturn, returnLog, points, purposes, timestamp) {
  const id = generateUUID()

  const params = [
    returnLog.returnId,
    missingReturn.licence.licenceRef,
    returnLog.startDate,
    returnLog.endDate,
    missingReturn.reportingFrequency,
    _metadata(missingReturn, points, purposes),
    timestamp,
    timestamp,
    missingReturn.reference,
    returnLog.dueDate,
    returnLog.returnCycleId,
    id,
    missingReturn.returnRequirementId
  ]

  const query = `INSERT INTO "returns"."returns" (
  return_id,
  regime,
  licence_type,
  licence_ref,
  start_date,
  end_date,
  returns_frequency,
  status,
  "source",
  metadata,
  created_at,
  updated_at,
  return_requirement,
  due_date,
  return_cycle_id,
  id,
  return_requirement_id,
  quarterly
)
VALUES (
  $1,
  'water',
  'abstraction',
  $2,
  $3,
  $4,
  $5,
  'due',
  'NALD',
  $6,
  $7,
  $8,
  $9,
  $10,
  $11,
  $12,
  $13,
  FALSE
);
  `

  return db.query(query, params)
}

module.exports = {
  go
}
