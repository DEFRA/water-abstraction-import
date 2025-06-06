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

    const returnSubmissions = await _fetchReturnSubmissions(start, end)

    if (returnSubmissions.length === 0) {
      return response
    }

    const totalRows = returnSubmissions.length

    response = {
      data: returnSubmissions,
      error: null,
      pagination: {
        perPage: ROWS_PER_PAGE,
        page: 1,
        totalRows,
        pageCount: Math.ceil(totalRows / ROWS_PER_PAGE)
      }
    }

    calculateAndLogTimeTaken(startTime, 'etl-versions: complete')
  } catch (error) {
    global.GlobalNotifier.omg(
      'etl-versions: errored',
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

async function _fetchReturnSubmissions (start, end) {
  const params = [start, end]
  const query = `
    SELECT
      v.version_id,
      v.return_id,
      v.nil_return
    FROM
      "returns".versions v
    INNER JOIN "returns"."returns" r
      ON r.return_id = v.return_id
    WHERE
      v.current = true
      AND v.user_id <> 'imported.from@nald.gov.uk'
      AND r."source" = 'NALD'
      AND v.created_at >= $1
      AND v.created_at <= $2;
  `

  return db.query(query, params)
}

module.exports = {
  go
}
