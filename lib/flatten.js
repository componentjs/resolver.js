var semver = require('semver')

/**
 * This probably belongs to a separate repo, but I'm lazy.
 *
 * returns the tree nodes, not the component.json,
 * so you can handle the resolved deps yourself.
 *
 * If `check` is true, this will check for duplicate dependencies
 * as well as locals with the same name.
 *
 * @param {Object} tree
 * @param {Boolean} check
 * @return {Array}
 * @api public
 */

module.exports = function (tree, check) {
  var resolved = []
  var deps = {}
  var dependencies = []
  var locals = []

  // duplicate dependencies
  var duplicates = {};
  // local name conflicts
  var conflicts = {};

  traverse(tree)

  // flatten the dependencies
  Object.keys(deps).forEach(function (name) {
    var branches = deps[name]
    var releases = Object.keys(branches)
    // duplicates detected
    if (check && releases.length > 1) duplicates[name] = branches;
    releases
    // non semver releases first
    .filter(function (release) {
      if (semver.valid(release)) return true
      dependencies.push(branches[release])
      return false
    })
    // ascending semver version
    .sort(semver.compare)
    .forEach(function (release) {
      dependencies.push(branches[release])
    })
  })

  // check for duplicate local names
  if (check) {
    var localnames = {};
    locals.forEach(function (local) {
      var name = local.name;
      (localnames[name] = localnames[name] || [])
      .push(local);
    });
    Object.keys(localnames).forEach(function (name) {
      if (localnames[name].length > 1) conflicts[name] = localnames[name];
    });
  }

  var out = dependencies.concat(locals);
  if (check) {
    out.duplicates = duplicates;
    out.conflicts = conflicts;
  }
  return out;

  function traverse(branch) {
    if (~resolved.indexOf(branch)) return
    resolved.push(branch)
    traverseDeps(branch)
    traverseLocals(branch)
    if (branch.type === 'local') return locals.push(branch)
    // group together a component and its duplicate releases
    var releases = deps[branch.name] = deps[branch.name] || {}
    releases[branch.ref] = branch
  }

  function traverseDeps(branch) {
    var deps = branch.dependencies
    if (!deps) return
    var names = Object.keys(deps)
    for (var i = 0; i < names.length; i++)
      traverse(deps[names[i]])
  }

  function traverseLocals(branch) {
    var locals = branch.locals
    if (!locals) return
    var names = Object.keys(locals)
    for (var i = 0; i < names.length; i++)
      traverse(locals[names[i]])
  }
}