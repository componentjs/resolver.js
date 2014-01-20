/**
 * Resolver methods for resolving remote dependencies.
 *
 * to do: only allow one concurrent resolve for every dependency `name`, but not reference.
 * would help with the semverisoning,
 * but not really
 */

var semver = require('semver')
var co = require('co')
var debug = require('debug')('resolver:dependencies')

var Resolver = require('./resolver')

/**
 * Create a dependency branch.
 *
 * @param {String} branch
 * @param {String} repo
 * @return {Object} branch
 * @api private
 */

Resolver.prototype.branchDependency = function* (name, ref, parent) {
  name = name.toLowerCase()
  var slug = name + '@' + ref
  var state = this.state[slug]
  if (state === 'resolving') {
    // resolving, so return when resolved
    return yield this.await(slug)
  } else if (state === 'resolved') {
    // resolved, so find that branch and return it
    for (var i = 0; i < this.dependencies.length; i++) {
      var dep = this.dependencies[i]
      if (dep.name === name && dep.ref === ref) return dep
    }
    throw new Error('wtf')
  }

  debug('resolving dependency %s@%s', name, ref)

  // mark as resolving
  this.state[slug] = 'resolving'
  var branch = {
    type: 'dependency',
    name: name,
    ref: ref,
    parent: parent,
    version: semver.valid(ref),
    dependencies: {}
  }

  // resolve a branch's remote names
  var remotes = branch.resolvedRemotes = []
  var _branch = branch
  do {
    var names = _branch.remotes || []
    for (var i = 0; i < names.length; i++)
      if (!remotes.indexOf(names[i]))
        remotes.push(names[i])
  } while (_branch = _branch.parent)

  var remote = yield* this.remote.resolve(remotes, name, ref)
  if (!remote && semver.valid(ref) && ref[0] !== 'v') {
    ref = branch.ref = 'v' + ref
    remote = yield* this.remote.resolve(remotes, name, ref)
    if (!remote) ref = branch.ref = ref.slice(1)
  }
  if (!remote)
    throw new Error(name + '@' + ref + ' was not found.')

  branch.node = yield* remote.getJSON(name, ref)

  this.dependencies.push(branch)
  this.resolve(branch)
  this.state[slug] = 'resolved'
  this.emit(name, branch)
  this.emit(slug, branch)
  if (this.__install) this.install(branch)
  return branch
}

/**
 * Resolve an object of dependencies.
 *
 * @param {Object} branch
 * @param {Object} dependencies
 * @api private
 */

Resolver.prototype.resolveDependencies = function (branch, deps) {
  if (!deps) return
  var ch = this.channel.dependencies
  Object.keys(deps).forEach(function (name) {
    ch.push(co(this.resolveDependency(branch, name, deps[name])))
  }, this)
}

/**
 * Resolve a branch's dependency.
 *
 * to do: remotes
 *
 * @param {Object} branch
 * @param {String} repo
 * @param {String} ref
 * @api {private}
 */

Resolver.prototype.resolveDependency = function* (branch, name, ref) {
  var child = branch.dependencies[name]
  // already resolved
  if (typeof child === 'object') return
  // wait to resolve refs when we do all the semver calls
  if (typeof child === 'string' && !this.resolvingSemver) return
  // try to resolve these now
  // may not be 100% optimal, but will be the fastest
  if (semver.validRange(ref) && !semver.valid(ref)) {
    if (this.resolvingSemver)
      return yield* this.resolveSemver(branch, name, ref)

    var version = this.resolveSemverLocally(branch, name, ref)
    // resolved locally
    if (version) ref = version
    // we'll resolve this later
    // to do: try every time a repo by `name` is resolved
    // until one finally matches
    else return branch.dependencies[name] = ref
  }
  child = yield* this.branchDependency(name, ref, branch)
  branch.dependencies[name] = child
}

/**
 * Get the currently resolved references of a dependency.
 *
 * @param {String} name
 * @return {Array} references
 * @api private
 */

Resolver.prototype.getReferences = function (name) {
  return this.dependencies.filter(function (dep) {
    return dep.name === name
  }).map(getRef)
}

function getRef(x) {
  return x.ref
}