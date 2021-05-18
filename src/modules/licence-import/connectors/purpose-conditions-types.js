'use strict';

const { pool } = require('../../../lib/connectors/db');
const queries = require('./queries/purpose-condition-types');

/**
 * Create purpose condition types
 * If they exist update the existing records
 */
const createPurposeConditionTypes = () => pool.query(queries.createPurposeConditionTypes);

exports.createPurposeConditionTypes = createPurposeConditionTypes;
