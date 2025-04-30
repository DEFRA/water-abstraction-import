'use strict'

/**
 * Persist the NALD submission data as WRLS return submissions and lines
 * @module
 */

const db = require('../../../lib/connectors/db.js')

/**
 * Persist the NALD submission data as WRLS return submissions and lines
 *
 * For both persisting the versions and the lines we make use of the PostgreSQL function json_array_elements() (see
 * https://www.postgresql.org/docs/15/functions-json.html) to convert our arrays of objects into rows of 'data'.
 *
 * From these we can then select specific columns for insertion into the tables. In this way, we're able to
 * perform a bulk insert. For example, instead of firing individual insert statements for each line, we just fire the
 * one. Doing this means we go from making 365 INSERT queries for a daily return submission to just 1!
 *
 * @param {object[]} lines - replicated missing return submission lines for the licence
 * @param {object[]} versions - replicated missing return submissions (versions) for the licence
 */
async function go (lines, versions) {
  await _persistVersions(versions)
  await _persistLines(lines)
}

async function _persistLines (lines) {
  const query = `
    INSERT INTO "returns".lines (
      end_date,
      line_id,
      metadata,
      quantity,
      reading_type,
      start_date,
      time_period,
      user_unit,
      version_id,
      created_at,
      updated_at
    )
    SELECT
      (data->>'end_date')::date AS end_date,
      (data->>'line_id'),
      (data->>'metadata')::jsonb AS metadata,
      (data->>'quantity')::numeric AS quantity,
      (data->>'reading_type') AS reading_type,
      (data->>'start_date')::date AS start_date,
      (data->>'time_period') AS time_period,
      (data->>'user_unit') AS user_unit,
      (data->>'version_id') AS version_id,
      now() AS created_at,
      now() AS updated_at
    FROM (
      SELECT json_array_elements($1) AS data
    ) tmp;
  `
  const params = [JSON.stringify(lines)]

  await db.query(query, params)
}

async function _persistVersions (versions) {
  const query = `
    INSERT INTO "returns".versions (
      current,
      metadata,
      nil_return,
      return_id,
      user_id,
      user_type,
      version_id,
      version_number,
      created_at,
      updated_at
    )
    SELECT
      CAST(data->>'current' AS BOOLEAN) AS "current",
      (data->>'metadata')::jsonb AS metadata,
      CAST(data->>'nil_return' AS BOOLEAN) AS nil_return,
      (data->>'return_id') AS return_id,
      (data->>'user_id') AS user_id,
      (data->>'user_type') AS user_type,
      (data->>'version_id') AS version_id,
      CAST(data->>'version_number' AS INTEGER) AS version_number,
      now() AS created_at,
      now() AS updated_at
    FROM (
      SELECT json_array_elements($1) AS data
    ) tmp;
  `
  const params = [JSON.stringify(versions)]

  await db.query(query, params)
}

module.exports = {
  go
}
