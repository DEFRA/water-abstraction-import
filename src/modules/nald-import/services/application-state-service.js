'use strict';

const applicationStateConnector = require('../../../lib/connectors/water/application-state');
const constants = require('../lib/constants');

const get = async () => {
  const key = constants.APPLICATION_STATE_KEY;
  const state = await applicationStateConnector.getState(key);
  return state.data;
};

const save = (etag, isDownloaded = false) => {
  const key = constants.APPLICATION_STATE_KEY;
  const data = { etag, isDownloaded };
  return applicationStateConnector.postState(key, data);
};

exports.get = get;
exports.save = save;
