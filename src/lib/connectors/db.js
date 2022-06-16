'use strict';

require('dotenv').config();

const pg = require('pg');
const config = require('../../../config.js');
const helpers = require('@envage/water-abstraction-helpers');
const { logger } = require('../../logger');

// Set date parser
const moment = require('moment');
const DATE_FORMAT = 'YYYY-MM-DD';
const dateMapper = str => moment(str).format(DATE_FORMAT);
pg.types.setTypeParser(pg.types.builtins.DATE, dateMapper);

const pool = helpers.db.createPool(config.pg, logger);

module.exports = {
  pool
};
