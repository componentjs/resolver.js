var Resolver = require('./resolver');

;[
  'locals',
  'dependencies',
  'semver',
].forEach(function (x) {
  require('./' + x);
});

module.exports = resolve;

function resolve(root, options, done) {
  if (typeof options === 'function') {
    done = options;
    options = {};
  }
  var resolver = new Resolver(root, options);
  if (typeof done === 'function') {
    // regular callback
    resolver.getTree(done);
  } else {
    // generators
    return resolver.tree();
  }
}

resolve.flatten = require('component-flatten');