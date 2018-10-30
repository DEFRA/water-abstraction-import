'use strict';

const Boom = require('boom');
const { lines, returns, versions } = require('../../lib/connectors/returns');
const {
  transformReturn,
  transformWeeklyLine,
  transformLine,
  filterLines
} = require('./lib/transformers');
const { generateNilLines, isDateWithinReturnCycle } = require('./lib/generate-nil-lines');
const { pick, flatMap } = require('lodash');

/**
 * Gets all the current versions that have a created_date
 * after the 'start' query params.
 *
 * Can optionally supply an 'end' query param to cap the range.
 */
const getVersions = async (request, h) => {
  const { start, end } = request.query;
  const filter = {
    current: true,
    created_at: { $gte: start }
  };

  if (end) {
    filter.created_at.$lte = end;
  }

  try {
    const pagination = Object.assign({ perPage: 2000 }, request.query.pagination);
    const response = await versions.findMany(filter, {}, pagination);

    if (response.data.length) {
      response.data = response.data.map(version => {
        return pick(version, 'version_id', 'return_id', 'nil_return');
      });
    }

    return response;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getVersion = async versionID => {
  const filter = { version_id: versionID };
  const { data } = await versions.findMany(filter);

  if (data.length === 0) {
    throw Boom.notFound(`Version not found for ${versionID}`);
  }
  return data[0];
};

const getReturn = async returnID => {
  const filter = { return_id: returnID };
  const { data } = await returns.findMany(filter);

  if (data.length === 0) {
    throw Boom.notFound(`Return not found for ${returnID}`);
  }
  return data[0];
};

const getLines = async versionID => {
  const filter = { version_id: versionID };
  const pagination = { perPage: 2000 };

  try {
    const { data } = await lines.findMany(filter, {}, pagination);
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getLinesTransformer = returnData => {
  return returnData.returns_frequency === 'week'
    ? transformWeeklyLine
    : transformLine;
};

/**
 * Gets an object containing all line information for a given
 * version id.
 *
 * Will convert weekly data to daily data to allow consumption
 * by NALD which does not have a strict concept of weekly data
 * and instead saves daily data.
 */
const getLinesForVersion = async (request, h) => {
  const { versionID } = request.params;

  try {
    const [version, linesResponse] = await Promise.all([
      getVersion(versionID),
      getLines(versionID)
    ]);

    const returnData = await getReturn(version.return_id);
    const linesTransformer = getLinesTransformer(returnData);
    const linesData = version.nil_return ? generateNilLines(returnData, version) : linesResponse;
    const lines = flatMap(linesData, linesTransformer);

    return {
      error: null,
      data: {
        nil_return: version.nil_return,
        under_query: false,
        under_query_comment: '',
        return: transformReturn(returnData),
        lines: filterLines(returnData, lines)
      }
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports = {
  getVersions,
  getLinesForVersion
};
