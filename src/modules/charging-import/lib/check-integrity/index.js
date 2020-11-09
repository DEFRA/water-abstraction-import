const { pool } = require('../../../../lib/connectors/db');
const queries = require('./queries');

const mappers = require('./mappers');
const { addError, createError, verifyRow } = require('./helpers');

const verifyTable = async (entityName, sourceQuery, targetQuery, targetMapper) => {
  const { rows: source } = await pool.query(sourceQuery);
  const { rows: target } = await pool.query(targetQuery);

  const errors = [];

  if (source.length !== target.length) {
    addError(errors, createError(`${entityName} source has ${source.length} records, target ${target.length}`));
  } else {
    source.forEach((row, i) => {
      const err = verifyRow(row, targetMapper(target[i]), i);
      addError(errors, err);
    });
  }

  return {
    errors,
    sourceRowCount: source.length,
    targetRowCount: target.length
  };
};

const verify = async () => {
  const tasks = [
    verifyTable('Charge versions', queries.sourceChargeVersions, queries.targetChargeVersions, mappers.mapChargeVersion),
    verifyTable('Charge elements', queries.sourceChargeElements, queries.targetChargeElements, mappers.mapChargeElement)
  ];

  const results = await Promise.all(tasks);

  return {
    chargeVersions: results[0],
    chargeElements: results[1],
    totalErrors: results.reduce((acc, row) => acc + row.errors.length, 0)
  };
};

exports.verify = verify;
