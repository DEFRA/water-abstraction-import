const { pool } = require('../../../../lib/connectors/db');
const { isArray } = require('lodash');
const queries = require('./queries');

const { mapChargeVersion, mapChargeElement, mapChargeAgreement } = require('./mappers');

const createError = (message, data = {}) => ({ message, data });

const isExponent = value => /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)$/.test(value);

/**
 * Checks integrity between source/target data values.
 * - Checks if strings are identical
 * - If they are not, but one value is a number with exponent, converts to floats
 *   and checks if these are identical
 * - returns false otherwise
 * @param  {String}  a - first value for comparison
 * @param  {String}  b - second value for comparison
 * @return {Boolean}
 */
const isEqual = (a, b) => {
  if (a === b) {
    return true;
  }
  if (isExponent(a) || isExponent(b)) {
    return parseFloat(a) === parseFloat(b);
  }
  return false;
};

const verifyRow = (source, target, i) => {
  return Object.keys(target).reduce((acc, key) => {
    if (!isEqual(source[key], target[key])) {
      acc.push(createError(`Row ${i} - difference in key ${key}`, { source, target }));
    }
    return acc;
  }, []);
};

const addError = (errors, error) => {
  if (error && isArray(error)) {
    errors.push(...error);
  } else if (error) {
    errors.push(error);
  }
  return errors;
};

const verifyTable = async (sourceQuery, targetQuery, targetMapper) => {
  const { rows: source } = await pool.query(sourceQuery);
  const { rows: target } = await pool.query(targetQuery);

  const errors = [];

  if (source.length !== target.length) {
    addError(errors, createError(`Source has ${source.length} records, target ${target.length}`));
  }

  source.forEach((row, i) => {
    const err = verifyRow(row, targetMapper(target[i]), i);
    addError(errors, err);
  });

  return {
    errors,
    sourceRowCount: source.length,
    targetRowCount: target.length
  };
};

const verify = async () => {
  const tasks = [
    verifyTable(queries.sourceChargeVersions, queries.targetChargeVersions, mapChargeVersion),
    verifyTable(queries.sourceChargeElements, queries.targetChargeElements, mapChargeElement),
    verifyTable(queries.sourceChargeAgreements, queries.targetChargeAgreements, mapChargeAgreement)
  ];

  const results = await Promise.all(tasks);

  return {
    chargeVersions: results[0],
    chargeElements: results[1],
    chargeAgreements: results[2],
    totalErrors: results.reduce((acc, row) => acc + row.errors.length, 0)
  };
};

exports.verify = verify;
