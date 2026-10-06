'use strict'

const db = require('../../../lib/connectors/db.js')

/**
 * Process irregular Nil returns with invalid split logs
 *
 * In testing we encountered two licences that have a specific issue that would overly complicate the fix we've built
 * for invalid split logs.
 *
 * In both cases there was an invalid split log, plus a 'void' return log.
 *
 * |Start date|End date  |Status   |
 * |----------|----------|---------|
 * |2024-04-04|2025-02-13|completed|
 * |2024-02-14|2025-03-31|completed|
 * |2024-04-04|2025-03-31|void     |
 *
 * The completed ones had submissions imported from NALD with all zeroes. The 'void' return was a user submission that
 * was a Nil return.
 *
 * The user submission was only voided because of the legacy logic that generated the invalid split logs. It should be
 * the return we retain, rather than the imported ones, which are just a result of the original Nil return anyway!
 *
 * > Nil return -> FME conversion -> NALD lines with 0 qty -> WRLS Import -> Split logs + 0's imported against them
 *
 * These are the only examples of this we hit, those we handle them separately. The main process than then handle the
 * rest of the invalid split logs.
 *
 * @param {Date} timestamp - Shared timestamp to assign to all the database changes in this fix
 */
async function go (timestamp) {
  const irregularNilReturns = await _fetchIrregularNilReturns()

  for (const irregularNilReturn of irregularNilReturns) {
    const { id, status } = irregularNilReturn

    if (status === 'completed') {
      await _dropIrregularNilReturn(id)
    } else {
      await _updateVoidNilReturn(id, timestamp)
    }
  }
}

async function _deleteReturnLog (query, id) {
  const params = [id]
  const sql = 'DELETE FROM "returns"."returns" r WHERE r.id = $1;'

  return query(sql, params)
}

async function _deleteSubmissionLines (query, id) {
  const params = [id]
  const sql = `DELETE FROM "returns".lines l WHERE l.version_id IN (
SELECT
  v.version_id
FROM
  "returns".versions v
WHERE
  v.return_log_id = $1
);
  `

  return query(sql, params)
}

async function _deleteSubmissions (query, id) {
  const params = [id]
  const sql = 'DELETE FROM "returns".versions v WHERE v.return_log_id = $1;'

  return query(sql, params)
}

async function _dropIrregularNilReturn (id) {
  await db.transaction(async (query) => {
    await _deleteSubmissionLines(query, id)
    await _deleteSubmissions(query, id)
    await _deleteReturnLog(query, id)
  })
}

async function _updateVoidNilReturn (id, timestamp) {
  const params = [timestamp, id]
  const sql = `UPDATE "returns"."returns" r
SET
  metadata = jsonb_set(r.metadata, '{isCurrent}', to_jsonb(false)),
  status = 'completed',
  updated_at = $1
WHERE
  id = $2;`

  return db.query(sql, params)
}

async function _fetchIrregularNilReturns () {
  const sql = `WITH
problem_return_cycle AS (
  SELECT
    rc.return_cycle_id
  FROM
    "returns".return_cycles rc
  WHERE
    rc.is_summer = FALSE
    AND rc.start_date = '2024-04-01'
),
irregular_nil_submissions AS (
  SELECT
    v.version_id,
    v.return_log_id,
    r.return_requirement_id,
    r.return_cycle_id
  FROM
    "returns".versions v
  INNER JOIN
    "returns"."returns" r
    ON r.id = v.return_log_id
  INNER JOIN
    problem_return_cycle prc
    ON prc.return_cycle_id = r.return_cycle_id
  WHERE
    v.user_type = 'external'
    AND v.nil_return = TRUE
    AND r.status = 'void'
    AND r.licence_ref IN ('AN/033/0037/012/R03', 'AN/033/0038/003/R01')
),
irregular_returns AS (
  SELECT
    r.*
  FROM
    "returns"."returns" r
  INNER JOIN
    irregular_nil_submissions ins
    ON ins.return_requirement_id = r.return_requirement_id
    AND ins.return_cycle_id = r.return_cycle_id
)
SELECT
  ir.id,
  ir.status
FROM
  irregular_returns ir
ORDER BY
  ir.licence_ref,
  ir.start_date ASC,
  ir.status ASC;
  `

  return db.query(sql)
}

module.exports = {
  go
}
