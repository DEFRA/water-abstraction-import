'use strict';

/**
 * There is a database problem
 */
class DBError extends Error {
  constructor (message) {
    super(message);
    this.name = 'DBError';
  }
}

exports.DBError = DBError;
