'use strict';
/**
 * Create message queue and register as server.messageQueue
 * @see {@link https://github.com/timgit/pg-boss/blob/master/docs/usage.md#start}
 */
const PgBoss = require('pg-boss');
const config = require('../../config.js');
const { logger } = require('../logger');
const { pool } = require('../lib/connectors/db');

const db = {
  executeSql: (sql, params) => pool.query(sql, params)
};

const createBoss = () => {
  const boss = new PgBoss({
    ...config.pgBoss,
    db
  });

  boss.on('error', error => {
    logger.error('PG Boss Error', error);
  });

  return boss;
};

const register = async server => {
  const boss = createBoss();
  server.decorate('server', 'messageQueue', boss);
  server.decorate('request', 'messageQueue', boss);
  await boss.start();
};

exports.plugin = {
  name: 'pgBoss',
  register
};
