require('dotenv').config();
const config = require('../../../config.js');
const { Pool } = require('pg');

const pool = new Pool(config.pg);

exports.pool = pool;
