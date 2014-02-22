var Resolver = module.exports = require('./resolver')

// exposed as both a prototype method and a constructor method
Resolver.flatten =
Resolver.prototype.flatten = require('component-flatten')

;[
  'locals',
  'dependencies',
  'semver',
].forEach(function (x) {
  require('./' + x)
})
