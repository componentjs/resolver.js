module.exports = require('./resolver')

;[
  'dependencies',
  'installer',
  'locals',
  'semver',
].forEach(function (x) {
  require('./' + x)
})