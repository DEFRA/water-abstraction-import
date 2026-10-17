'use strict'

const db = require('../../../lib/connectors/db.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (monitoringStations, timestamp) {
  let messages = []

  for (const monitoringStation of monitoringStations) {
    const { label } = monitoringStation

    try {
      await _createMonitoringStation(monitoringStation, timestamp)
    } catch (error) {
      console.error(`Error: ${error.message}`, monitoringStation, error)
      messages.push(`Monitoring station ${label}: ${error.message}`)
    }
  }

  return messages
}

async function _createMonitoringStation (monitoringStation, timestamp) {
  const {
    catchmentName,
    easting,
    gridReference,
    label,
    lat,
    long,
    northing,
    riverName,
    stationReference,
    wiskiId
  } = monitoringStation

  const params = [
    label,
    lat,
    long,
    easting,
    northing,
    gridReference,
    catchmentName,
    riverName,
    wiskiId,
    stationReference,
    timestamp,
    timestamp,
    generateUUID()
  ]
  const sql = `INSERT INTO water.gauging_stations
(
  "label",
  lat,
  long,
  easting,
  northing,
  grid_reference,
  catchment_name,
  river_name,
  wiski_id,
  station_reference,
  status,
  metadata,
  date_created,
  date_updated,
  gauging_station_id,
  hydrology_station_id,
  is_test
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9,
  $10,
  NULL,
  NULL,
  $11,
  $12,
  $13,
  NULL,
  FALSE
);`

  await db.query(sql, params)
}

module.exports = {
  go
}
