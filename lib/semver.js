/**
 * Resolve any semvers including `*` that weren't satisifed during resolving dependencies.
 *
 * Note that this isn't really optimal yet and probably won't ever be!
 * Please use wide semver ranges!
 *
 * To do:
 *
 *   - resolve all semver ranges before `*`s
 */

var co = require('co')
var semver = require('semver')

var Resolver = require('./resolver')

/**
 * Iterate through all the locals and dependencies to resolve semvers.
 *
 * @api private
 */

Resolver.prototype.semver = function () {
  this.locals.forEach(this.resolveSemvers, this)
  this.dependencies.forEach(this.resolveSemvers, this)
}

/**
 * Iterate through all the .dependencies of the branch
 * and resolve.
 *
 * @param {Object} branch
 * @api private
 */

Resolver.prototype.resolveSemvers = function (branch) {
  var ch = this.channel.semver
  Object.keys(branch.dependencies).forEach(function (name) {
    var ref = branch.dependencies[name]
    if (typeof ref !== 'string') return
    ch.push(co(this.resolveSemver(branch, name, ref)))
  }, this)
}

/**
 * Resolve semver. First, we try locally, then we try remotely.
 *
 * @param {Object} branch
 * @param {String} name
 * @param {String} reference
 * @api private
 */

Resolver.prototype.resolveSemver = function* (branch, name, ref) {
  // convert the semver range to a reference
  ref = this.resolveSemverLocally(branch, name, ref)
    || (yield* this.resolveSemverRemotely(branch, name, ref))
  var child = yield* this.branchDependency(name, ref, branch)
  branch.dependencies[name] = child
}

/**
 * Resolve semver locally without touching the remote if possible
 *
 * @param {String} name
 * @param {String} ref
 * @return {String} reference
 * @api private
 */

Resolver.prototype.resolveSemverLocally = function (branch, name, ref) {
  var references = this.getReferences(name)
  var versions = references
    .filter(semver.valid)
    .sort(semver.rcompare)
  var version = semver.maxSatisfying(versions, ref)
  if (version) return version
  // can not be resolved with semver
  if (ref !== '*') return
  var branches = references.filter(function (ref) {
    // they need a method for this :(
    return !semver.valid(ref)
  })
  // return any release
  if (branches.length) return branches[0]
}

/**
 * Resolve semver by accessing the remote.
 *
 * @param {String} name
 * @param {String} ref
 * @return {String} reference
 * @api private
 */

Resolver.prototype.resolveSemverRemotely = function* (branch, name, ref) {
  var remote = yield* this.remote.resolve(branch.resolvedRemotes, name)
  var versions = yield* remote.getVersions(name)
  var version = semver.maxSatisfying(versions, ref)
  if (version) return version
  // no satisfying versions!
  // this is an error for semver ranges
  if (ref !== '*')
    throw new Error('invalid semver range "' + ref + '" for "' + name + '"')
  // to do: use the actual "main" branch
  // ex. gh-pages
  return 'master'
}