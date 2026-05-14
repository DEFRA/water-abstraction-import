'use strict'

const fs = require('node:fs')
const { parse } = require('csv-parse/sync')

function go (path, filename) {
  const fileData = fs.readFileSync(`${path}/${filename}`)

  const csvData = _parseDataToCsv(fileData)

  const unzippedData = _unzip(csvData)

  return _rows(unzippedData, filename)
}

function _convertToBoolean (value) {
  if (!value || value.toLowerCase() === 'n') {
    return false
  }

  return true
}

function _convertToNumber (value) {
  if (!value) {
    return null
  }

  return Number(value)
}

function _parseDataToCsv (csvData) {
  const cleaned = csvData.toString().replace(/^\uFEFF/, '') // Remove BOM

  return parse(cleaned, {
    skip_lines_with_empty_values: true,
    skip_empty_lines: true,
    trim: true
  })
}

function _rows (unzippedData, filename) {
  const rows = []

  const headerLine = unzippedData[0]

  for (let i = 1; i < unzippedData.length; i++) {
    const line = unzippedData[i]
    const rowObject = {
      filename,
      process: false,
      licenceRef: line[0],
      returnRef: line[1],
      siteDescription: line[2],
      purpose: line[3],
      nilReturn: _convertToBoolean(line[4]),
      useMeter: _convertToBoolean(line[5]),
      meterMake: line[6],
      meterNumber: line[7],
      returnId: line[line.length - 1],
      lines: []
    }

    for (let j = 8; j < line.length - 1; j++) {
      rowObject.lines.push({
        endDate: new Date(headerLine[j]),
        quantity: _convertToNumber(line[j])
      })
    }

    const hasZeroQuantityLines = rowObject.lines.some((line) => {
      return line.quantity === 0
    })

    // There are some funnies in the file where we have a licence and reference, but no return ID. Fortunately they are
    // never populated but just to be sure we only want to process rows where we have a return ID _and_ zero qty lines.
    rowObject.process = hasZeroQuantityLines && !!rowObject.returnId

    rows.push(rowObject)
  }

  return rows
}

function _unzip (csvData) {
  if (csvData.length === 0) {
    return []
  }

  const noOfLicences = csvData[0].length

  return Array.from({ length: noOfLicences }, (_, index) => {
    return csvData.map((row) => row[index])
  })
}

module.exports = {
  go
}
