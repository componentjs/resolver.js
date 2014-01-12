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
  for (var i = 0; i < this.locals.length; i++)
    this.resolveSemvers(this.locals[i])
  for (var i = 0; i < this.dependencies.length; i++)
    this.resolveSemvers(this.dependencies[i])
}

/**
 * Iterate through all the .dependencies of the branch
 * and resolve.
 *
 * @param {Object} branch
 * @api private
 */

Resolver.prototype.resolveSemvers = co(function* (branch) {
  var ch = this.channel.semver
  var names = Object.keys(branch.dependencies)
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    var ref = branch.dependencies[name]
    if (typeof ref !== 'string') return
    yield* ch.drain()
    this.resolveSemver(branch, name, ref, ch.push())
  }
})

/**
 * Resolve semver. First, we try locally, then we try remotely.
 *
 * @param {Object} branch
 * @param {String} name
 * @param {String} reference
 * @api private
 */

Resolver.prototype.resolveSemver = co(function* (branch, name, ref) {
  // convert the semver range to a reference
  ref = this.resolveSemverLocally(branch, name, ref)
    || (yield* this.resolveSemverRemotely(branch, name, ref))
  var child = yield* this.branchDependency(name, ref, branch)
  branch.dependencies[name] = child
})

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