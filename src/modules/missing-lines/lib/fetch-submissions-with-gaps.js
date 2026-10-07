'use strict'

const db = require('../../../lib/connectors/db.js')

async function go (region) {
  const params = [region]
  const query = `WITH
active_versions AS (
  -- 1. Grab all non-nil versions (filtering out nil_return = true)
  SELECT
    v.version_id,
    v.return_log_id,
    v.version_number
  FROM
    "returns".versions v
  INNER JOIN
    "returns"."returns" r
    ON v.return_log_id = r.id
  WHERE
    v.nil_return = FALSE
    AND SUBSTRING(r.return_id, 4, 1) = $1
),
line_gaps AS (
  -- 2. Join non-nil versions to returns and lines, windowing over each version_id
  SELECT
    av.return_log_id,
    av.version_id,
    av.version_number,
    r.returns_frequency,
    r.start_date AS return_start,
    r.end_date AS return_end,
    l.start_date AS line_start,
    l.end_date AS line_end,
    LEAD(l.start_date) OVER (PARTITION BY av.version_id ORDER BY l.start_date) AS next_line_start
  FROM
    active_versions av
  INNER JOIN
    "returns"."returns" r ON r.id = av.return_log_id
  LEFT JOIN
    "returns".lines l ON av.version_id = l.version_id
),
version_status AS (
  -- 3. Aggregate at the specific VERSION level
  SELECT
    lg.return_log_id,
    lg.returns_frequency,
    lg.version_id,
    lg.version_number,
    lg.return_start,
    lg.return_end,
    MIN(lg.line_start) AS first_line_start,
    MIN(lg.line_end) AS first_line_end,    -- Added to identify the first Saturday
    MAX(lg.line_end) AS last_line_end,
    BOOL_OR(lg.next_line_start > lg.line_end + INTERVAL '1 day') AS has_middle_gap
  FROM
    line_gaps lg
  GROUP BY
    lg.return_log_id,
    lg.returns_frequency,
    lg.version_id,
    lg.version_number,
    lg.return_start,
    lg.return_end
),
versions_with_gaps AS (
  -- 4. Identify specific gap types with frequency-aware logic
  SELECT
    vs.return_log_id,
    vs.return_start,
    vs.return_end,
    vs.returns_frequency,
    vs.version_id,
    vs.version_number,
    -- Non-nil version with no lines attached
    (CASE
      WHEN vs.first_line_start IS NULL THEN true
      ELSE false
    END) AS gap_no_lines,
    -- Missing line(s) at the beginning
    (CASE
      -- WEEKLY: First line's end date (Saturday) shouldn't be more than 6 days after return_start
      WHEN vs.returns_frequency = 'week' AND vs.first_line_end > (vs.return_start + INTERVAL '6 days')::DATE THEN true
      -- DAILY/MONTHLY: Standard check
      WHEN (vs.returns_frequency != 'week' OR vs.returns_frequency IS NULL) AND vs.first_line_start > vs.return_start THEN true
      ELSE false
    END) AS gap_beginning,
    -- Missing line(s) at the end
    (CASE
      -- WEEKLY: Legitimate for the last line (Saturday) to be up to 6 days before return_end
      WHEN vs.returns_frequency = 'week' AND vs.last_line_end < (vs.return_end - INTERVAL '6 days')::DATE THEN true
      -- DAILY/MONTHLY: Standard check
      WHEN (vs.returns_frequency != 'week' OR vs.returns_frequency IS NULL) AND vs.last_line_end < vs.return_end THEN true
      ELSE false
    END) AS gap_end,
    -- Missing line(s) in the middle
    (CASE
      WHEN vs.has_middle_gap = true THEN true
      ELSE false
    END) AS gap_middle
  FROM
    version_status vs
)
-- 5. Filter for returns that failed ANY of the gap checks
SELECT
  vwg.return_log_id AS "returnLogId",
  vwg.return_start AS "returnStartDate",
  vwg.return_end AS "returnEndDate",
  vwg.returns_frequency AS "reportingFrequency",
  vwg.version_id AS "versionId"
FROM
  versions_with_gaps vwg
WHERE
  vwg.gap_no_lines = true
  OR vwg.gap_beginning = true
  OR vwg.gap_end = true
  OR vwg.gap_middle = true
ORDER BY
  vwg.returns_frequency ASC,
  vwg.gap_no_lines ASC,
  vwg.gap_beginning ASC,
  vwg.gap_end ASC,
  vwg.gap_middle ASC;`

  const results = await db.query(query, params)

  return results.map((result) => {
    return {
      ...result,
      returnStartDate: new Date(result.returnStartDate),
      returnEndDate: new Date(result.returnEndDate)
    }
  })
}

module.exports = {
  go
}
