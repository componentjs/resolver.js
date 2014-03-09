/**
 * Resolver methods for resolving local dependencies.
 */

var co = require('co')
var fs = require('graceful-fs')
var join = require('path').join
var resolve = require('path').resolve
var dirname = require('path').dirname;
var relative = require('path').relative;
var validate = require('component-validator');
var debug = require('debug')('component-resolver:locals');

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
  if (!component) component = yield* this.read(root);
  if (!component) throw new Error('trouble finding component at "' + root + '".');
  validate(component);

  var branch = {
    type: 'local',
    path: root,
    filename: join(root, 'component.json'),
    node: component,
    parent: parent,
    locals: {},
    dependencies: {},
    dependents: []
  };

  branch.name = component.name
    // implies the folder name as the name
    || root.replace(dirname(root), '').slice(1);
  branch.canonical = relative(this.root, root) || branch.name;
  // make sure canonical names are always relative
  if (branch.canonical.indexOf('../')) branch.canonical = './' + branch.canonical;
  branch.remotes = component.remotes || []
  if (!parent && !branch.remotes.length) {
    // this is supposed to be the "root" component,
    // but i don't like checking for the existence of
    // the parent because it seems hacky to me.
    branch.remotes = this.constructor.remotes;
  }
  this.resolveRemotes(branch);
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
  if (!~child.dependents.indexOf(branch)) child.dependents.push(branch);
  if ((child.node.name || child.name) !== name)
    throw new Error('component at "' + branch.path + '"\'s name does not match the component\'s');
  debug('resolved local "%s"', branch);
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
  var parent = branch;
  do {
    var paths = parent.paths;
    for (var i = 0; i < paths.length; i++) {
      var path = join(paths[i], name);
      try {
        yield stat(join(path, 'component.json'));
        return path;
      } catch (err) {
        continue;
      }
    }
  } while (parent = parent.parent)

  throw new Error('Cannot resolve "' + branch.name + '\'s local dependency "' + name + '".');
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
    buf = yield fs.readFile.bind(null, filename, 'utf8');
  } catch (_err) {
    if (_err.code !== 'ENOENT') throw _err;
    throw new Error('failed to find a component.json at "' + filename + '".');
  }
  try {
    buf = JSON.parse(buf)
  } catch (_err) {
    throw new Error('error parsing the component.json at "' + filename + '"');
  }
  return this.cache[filename] = buf
}

function stat(filename) {
  return function (done) {
    fs.stat(filename, done)
  }
}