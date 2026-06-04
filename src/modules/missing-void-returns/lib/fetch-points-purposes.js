'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (returnRequirementId) {
  const [points, purposes] = await Promise.all([
    _points(returnRequirementId),
    _purposes(returnRequirementId)
  ])

  return {
    points,
    purposes
  }
}

async function _points (returnRequirementId) {
  const params = [returnRequirementId]
  const query = `SELECT
  rrp.description,
  rrp.ngr_1,
  rrp.ngr_2,
  rrp.ngr_3,
  rrp.ngr_4
FROM
  water.return_requirement_points rrp
WHERE
  rrp.return_requirement_id = $1;
  `

  return db.query(query, params)
}

async function _purposes (returnRequirementId) {
  const params = [returnRequirementId]
  const query = `SELECT
  rrp.purpose_alias,
  pu.description AS tertiary_description,
  pu.legacy_id AS tertiary_legacy_id,
  pp.description AS primary_description,
  pp.legacy_id AS primary_legacy_id,
  ps.description AS secondary_description,
  ps.legacy_id AS secondary_legacy_id
FROM
  water.return_requirement_purposes rrp
INNER JOIN
  water.purposes_uses pu
  ON pu.purpose_use_id = rrp.purpose_use_id
INNER JOIN
  water.purposes_primary pp
  ON pp.purpose_primary_id = rrp.purpose_primary_id
INNER JOIN
  water.purposes_secondary ps
  ON ps.purpose_secondary_id = rrp.purpose_secondary_id
WHERE
  rrp.return_requirement_id = $1;
  `

  return db.query(query, params)
}

module.exports = {
  go
}
