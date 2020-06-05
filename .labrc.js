// default settings for lab test runs.
//
// This is overridden if arguments are passed to lab via the command line.
module.exports = {
  globals: [
    '__classPrivateFieldGet',
    '__extends',
    '__assign',
    '__rest',
    '__decorate',
    '__param',
    '__metadata',
    '__awaiter',
    '__generator',
    '__exportStar',
    '__values',
    '__read',
    '__spread',
    '__spreadArrays',
    '__await',
    '__asyncGenerator',
    '__asyncDelegator',
    '__asyncValues',
    '__makeTemplateObject',
    '__importStar',
    '__importDefault',
    '__classPrivateFieldSet',
    'version',
    'payload',
    'fetch',
    'Response',
    'Headers',
    'Request',
    '__coverage__'
  ].join(','),
  verbose: true,

  'coverage-exclude': [
    'migrations',
    'node_modules',
    'test'
  ]
};
