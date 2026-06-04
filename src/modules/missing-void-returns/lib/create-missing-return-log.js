'use strict'

const db = require('../../../lib/connectors/db.js')
const FetchPointsPurposes = require('./fetch-points-purposes.js')
const { formatDateObjectToISO } = require('../../../lib/date-helpers.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (missingReturn, timestamp) {
  const { points, purposes } = await FetchPointsPurposes.go(missingReturn.returnRequirement.id)

  return _returnLog(missingReturn, points, purposes, timestamp)
}

function _abstractionPeriodValue(value) {
  return value ? value.toString() : 'null'
}

function _createReturnLog(returnLogData) {
  const params = [

  ]
}

function _metadata (missingReturn, points, purposes) {
  const { returnRequirement } = missingReturn

  return {
    description: returnRequirement.siteDescription,
    isCurrent: true,
    isFinal: false,
    isSummer: returnRequirement.summer,
    isTwoPartTariff: returnRequirement.twoPartTariff,
    isUpload: returnRequirement.multipleUpload,
    nald: {
      regionCode: missingReturn.regionId,
      areaCode: returnRequirement.areaCode,
      formatId: returnRequirement.reference,
      periodStartDay: _abstractionPeriodValue(returnRequirement.abstractionPeriod.startDay),
      periodStartMonth: _abstractionPeriodValue(returnRequirement.abstractionPeriod.startMonth),
      periodEndDay: _abstractionPeriodValue(returnRequirement.abstractionPeriod.endDay),
      periodEndMonth: _abstractionPeriodValue(returnRequirement.abstractionPeriod.endMonth)
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

function _returnId (missingReturn) {
  const regionCode = missingReturn.regionId
  const licenceReference = missingReturn.licenceRef
  const returnReference = missingReturn.returnRequirement.reference
  const startDateAsString = formatDateObjectToISO(missingReturn.returnCycle.startDate)
  const endDateAsString = formatDateObjectToISO(missingReturn.returnCycle.endDate)

  return `v1:${regionCode}:${licenceReference}:${returnReference}:${startDateAsString}:${endDateAsString}`
}

async function _returnLog (missingReturn, points, purposes, timestamp) {
  const returnId = _returnId(missingReturn)
  const id = generateUUID()

  const params = [
    returnId,
    missingReturn.licenceRef,
    missingReturn.returnCycle.startDate,
    missingReturn.returnCycle.endDate,
    missingReturn.returnRequirement.reportingFrequency,
    _metadata(missingReturn, points, purposes),
    timestamp,
    timestamp,
    missingReturn.returnRequirement.reference,
    missingReturn.returnCycle.dueDate,
    missingReturn.returnCycle.id,
    id,
    missingReturn.returnRequirement.id
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
  'void',
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

  await db.query(query, params)

  return { id, returnId }
}

module.exports = {
  go
}
