var parchan = require('parchan')
var remotes = require('remotes')
var resolve = require('path').resolve
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = Resolver

inherits(Resolver, EventEmitter)

Resolver.flatten =
Resolver.prototype.flatten = require('./flatten')

/**
 * Resolve a component's locals and dependencies.
 * `root` can either be the component.json itself or the working directory.
 *
 * @param {String|Object} root || component
 * @param {Object} options
 * @api public
 */

function Resolver(root, options) {
  if (!(this instanceof Resolver))
    return new Resolver(root, options)

  if (!root || !options)
    throw new Error('both component and options are required as arguments.')

  EventEmitter.call(this, options)

  if (!root) root = process.cwd()
  if (typeof root === 'string') {
    this.root = root
  } else {
    // all components need a name!
    // we fix objects as arguments so you can just
    // do {dependencies: {}}
    root.name = root.name || 'root'
    this.main = root
    this.root = options.root || process.cwd()
  }

  // include development stuff, false by default
  this.dev = !!options.development
  // resolve dependencies, true by default
  this.deps = options.dependencies !== false
  // output folder for installs
  this.out = resolve(process.cwd(), options.out || 'components')

  if (options.remote === 'local') {
    // read components locally
    this.remote = new remotes.Local({
      out: this.out
    })
  } else {
    this.remote = options.remote
    // does not install by default
    // can only install if the remote is not local
    this.__install = !!options.install
  }
  // not sure if a remote is really required,
  // especially on local dependency resolution
  if (!this.remote)
    throw new Error('remote required')

  // to do: concurrency options
  this.channel = {
    locals: parchan({
      concurrency: 16
    }),
    dependencies: parchan({
      concurrency: 5
    }),
    semver: parchan({
      concurrency: 5
    }),
    installs: parchan({
      concurrency: 2
    })
  }

  // keep track of branches in a flat list
  // so you don't have to traverse a tree
  // has no order!
  this.locals = []
  this.dependencies = []

  // keep track of resolution states
  this.state = {}
  // keep track of local component.jsons
  this.cache = {}

  // fields to check to download files
  this.fields = options.fields || [
    'scripts',
    'styles',
    'templates',
    'json',
    'fonts',
    'images',
    'files',
  ]
}

/**
 * Call this to execute the resolver and return the tree.
 *
 * @return {Object} tree
 * @api public
 */

Resolver.prototype.tree = function* () {
  // resolve the root component
  var tree = this.branch = yield* this.branchLocal(this.root, this.main)
  // local and github remotes by default
  if (!tree.remotes.length) tree.remotes.push('local', 'github')
  // kick off everything
  this.resolve(tree)
  // wait until all the channels are clear
  var ch = this.channel
  yield* ch.locals.flush()
  yield* ch.dependencies.flush()
  // start resolving all the hanging semvers after
  // all the locals and dependencies are done.
  // not ideal as we should do this ASAP,
  // but i'm not sure how.
  this.semver()
  yield* ch.semver.flush()
  yield* ch.installs.flush()
  return tree
}

/**
 * Resolve a branch's dependency and local branches.
 *
 * @param {Object} branch
 * @api private
 */

Resolver.prototype.resolve = function (branch) {
  var component = branch.node
  var development = this.dev && component.development

  // resolve dependencies in a different channel
  if (this.deps) {
    this.resolveDependencies(branch, component.dependencies)
    if (development)
      this.resolveDependencies(branch, development.dependencies)
  }

  // resolve locals in a different channel
  this.resolveLocals(branch, component.locals)
  if (development)
    this.resolveLocals(branch, development.locals)
}

/**
 * Await an event.
 *
 * @param {String} event
 * @returns {Object} branch
 * @api private
 */

Resolver.prototype.await = function (event) {
  var self = this
  return function (done) {
    self.once(event, function (branch) {
      done(null, branch)
    })
  }
}