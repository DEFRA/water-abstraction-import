const { isArray } = require('lodash');

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

exports.createError = createError;
exports.isExponent = isExponent;
exports.isEqual = isEqual;
exports.verifyRow = verifyRow;
exports.addError = addError;
