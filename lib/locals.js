/**
 * Resolver methods for resolving local dependencies.
 */

var co = require('co')
var fs = require('graceful-fs')
var join = require('path').join
var resolve = require('path').resolve
var dirname = require('path').dirname;
var debug = require('debug')('resolver:locals');

var Resolver = require('./resolver')

/**
 * Create a branch.
 *
 * @param {String} root
 * @param {Object} component
 * @return {Object} branch
 * @api private
 */

Resolver.prototype.branchLocal = function* (root, component, parent) {
  var state = this.state[root]
  if (state === 'resolving') {
    // resolving, so return the resolved branch
    return yield this.await(root)
  } else if (state === 'resolved') {
    // resolved, so find that branch and return it
    for (var i = 0; i < this.locals.length; i++)
      if (this.locals[i].path === root)
        return this.locals[i]
    throw new Error('wtf')
  }

  debug('resolving local at "%s"', root)

  // mark as resolving
  this.state[root] = 'resolving'
  var branch = {
    type: 'local',
    path: root,
    parent: parent,
    node: component || (yield* this.read(root)),
    locals: {},
    dependencies: {}
  }

  branch.node = component = component || (yield* this.read(root))
  branch.name = component.name = component.name
    // implies the folder name as the name
    || root.replace(dirname(root), '').slice(1)
  branch.remotes = component.remotes || []
  if (!parent && !branch.remotes.length) {
    // this is supposed to be the "root" component,
    // but i don't like checking for the existence of
    // the parent because it seems hacky to me.
    branch.remotes = this.constructor.remotes;
  }
  // convert the paths to absolute paths
  branch.paths = (component.paths || []).map(function (dir) {
    return resolve(branch.path, dir)
  })
  this.locals.push(branch)
  this.resolve(branch)
  this.state[root] = 'resolved'
  this.emit(root, branch)
  return branch
}

/**
 * Resolve locals.
 *
 * @param {Object} branch
 * @api private
 */

Resolver.prototype.resolveLocals = function (branch, locals) {
  if (!locals) return
  var ch = this.channel.locals
  locals.forEach(function (local) {
    ch.push(co(this.resolveLocal(branch, local)))
  }, this)
}

/**
 * Resolve a branch's local dependency.
 *
 * @param {Object} branch
 * @param {String} name
 * @api private
 */

Resolver.prototype.resolveLocal = function* (branch, name) {
  var path = yield* this.resolveLocalPath(branch, name)
  var child = yield* this.branchLocal(path, null, branch)
  branch.locals[name] = child
  if (child.node.name !== name)
    throw new Error('component at "' + branch.path + '"\'s name does not match the component\'s')
}

/**
 * Resolve a locals path. We traverse up the tree until
 * we find a local component with `name` in one of the paths.
 *
 * @param {Object} branch
 * @param {String} name
 * @return {String} root
 * @api private
 */

Resolver.prototype.resolveLocalPath = function* (branch, name) {
  do {
    var paths = branch.paths
    for (var i = 0; i < paths.length; i++) {
      var path = join(paths[i], name)
      try {
        yield stat(join(path, 'component.json'))
        return path
      } catch (err) {
        continue
      }
    }
  } while (branch = branch.parent)
}

/**
 * Read a component at folder/component.json.
 * Also caches it.
 *
 * @param {String} folder
 * @return {Object}
 * @api private
 */

Resolver.prototype.read = function* read(folder) {
  var filename = join(folder, 'component.json')
  if (filename in this.cache) return this.cache[filename]
  var buf
  try {
    buf = yield function (done) {
      fs.readFile(filename, 'utf8', done)
    }
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      err.message = 'failed to find a component.json at "' + filename + '"'
      err.filename = filename
    }
    throw err
  }
  try {
    buf = JSON.parse(buf)
  } catch (err) {
    err.message = 'error parsing the component.json at "' + filename + '"'
    throw err
  }
  return this.cache[filename] = buf
}

function stat(filename) {
  return function (done) {
    fs.stat(filename, done)
  }
}