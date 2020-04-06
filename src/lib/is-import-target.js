const isImportTarget = () =>
  ['local', 'dev', 'development', 'test', 'preprod'].includes(process.env.NODE_ENV);

module.exports = isImportTarget;
