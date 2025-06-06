'use strict'

const db = require('../../lib/connectors/db.js')
const { currentTimeInNanoseconds, calculateAndLogTimeTaken } = require('../../lib/general.js')

const FAR_IN_THE_FUTURE = new Date('2099-12-31T23:59:59')
const ROWS_PER_PAGE = 2000

async function go (start, end) {
  let response = _emptyResponse()

  try {
    const startTime = currentTimeInNanoseconds()

    if (!end) {
      end = FAR_IN_THE_FUTURE
    }

    const returnLogs = await _fetchReturnLogs(start, end)

    if (returnLogs.length === 0) {
      return response
    }

    const data = _transformReturnLogs(returnLogs)
    const totalRows = data.length

    response = {
      data,
      error: null,
      pagination: {
        perPage: ROWS_PER_PAGE,
        page: 1,
        totalRows,
        pageCount: Math.ceil(totalRows / ROWS_PER_PAGE)
      }
    }

    calculateAndLogTimeTaken(startTime, 'etl-returns: complete')
  } catch (error) {
    global.GlobalNotifier.omg(
      'etl-returns: errored',
      { start, end, errorMessage: error.message, errorStack: error.stack }
    )

    throw error
  }

  return response
}

function _emptyResponse () {
  return {
    data: [],
    error: null,
    pagination: {
      perPage: ROWS_PER_PAGE,
      page: 1,
      totalRows: 0,
      pageCount: 0
    }
  }
}

async function _fetchReturnLogs (start, end) {
  const params = [start, end]
  const query = `
    SELECT
      r.returns_frequency,
      r.licence_ref,
      r.start_date,
      r.end_date,
      r.status,
      r.received_date,
      r.under_query,
      (CASE
        WHEN r.under_query_comment IS NULL THEN
          ''
        ELSE
          r.under_query_comment
      END) AS under_query_comment,
      r.return_id,
      SUBSTRING(r.return_id, 4, 1) AS region_code,
      r.return_requirement,
      -- Get the 1st of the month for start_date, then convert it to the format NALD will expect
      to_char(date_trunc('month', r.start_date)::date, 'YYYYMMDD000000') AS nald_date_from,
      to_char(r.received_date, 'YYYYMMDD000000') AS nald_ret_date,
      rc.start_date AS return_cycle_start
    FROM
      "returns"."returns" r
    INNER JOIN water.events e
      ON e.metadata->>'returnId' = r.return_id
    INNER JOIN "returns".return_cycles rc
      ON rc.return_cycle_id = r.return_cycle_id
    WHERE
      e."type" = 'return.status'
      AND e.created >= $1
      AND e.created <= $2;
  `

  return db.query(query, params)
}

function _transformReturnLogs (returnLogs) {
  return returnLogs.map((returnLog) => {
    return {
      returns_frequency: returnLog.returns_frequency,
      licence_ref: returnLog.licence_ref,
      start_date: returnLog.start_date,
      end_date: returnLog.end_date,
      status: returnLog.status,
      received_date: returnLog.received_date,
      under_query: returnLog.under_query,
      under_query_comment: returnLog.under_query_comment,
      return_id: returnLog.return_id,
      regionCode: parseInt(returnLog.region_code),
      formatId: parseInt(returnLog.return_requirement),
      nald_date_from: returnLog.nald_date_from,
      nald_ret_date: returnLog.nald_ret_date,
      return_cycle_start: returnLog.return_cycle_start
    }
  })
}

module.exports = {
  go
}
