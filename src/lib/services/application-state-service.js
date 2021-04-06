'use strict';

const applicationStateConnector = require('../connectors/water/application-state');
const constants = require('../../modules/nald-import/lib/constants');

const get = async identifier => {
  const state = await applicationStateConnector.getState(identifier);
  return state.data;
};

const save = (key = constants.APPLICATION_STATE_KEY, data = {}) => applicationStateConnector.postState(key, data);

exports.get = get;
exports.save = save;
