var co = require('co');
var chanel = require('chanel')
var remotes = require('remotes')
var resolve = require('path').resolve
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var debug = require('debug')('component-resolver');

module.exports = Resolver

inherits(Resolver, EventEmitter)

// exposed as both a prototype method and a constructor method
Resolver.flatten =
Resolver.prototype.flatten = require('component-flatten')

// default remote names for the base component.
// more will be added as we support them.
Resolver.remotes = [
  'local',
  'github',
];

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

  var concurrency = options.concurrency || {};

  if (!root) root = process.cwd()
  if (typeof root === 'string') {
    this.root = root;
  } else {
    // all components need a name!
    // we fix objects as arguments so you can just
    // do {dependencies: {}}
    root.name = root.name || 'root';
    this.main = root;
    this.root = options.root || process.cwd();
  }

  // include development stuff, false by default
  this.dev = !!options.development;
  // resolve dependencies, true by default
  this.deps = options.dependencies !== false;
  // output folder for installs
  this.out = resolve(this.root, options.out || options.dir || 'components');
  this.install = !!options.install;
  this.verbose = !!options.verbose;

  var r = options.remote || options.remotes;
  // if you want to set your own remote options
  // like auth, netrc, proxy, etc.,
  // then create your own remote instance.
  var ro = {
    verbose: this.verbose,
    root: this.root,
    out: this.out,
    // this is how many files are downloaded at a time.
    // 5 concurrency installs and 2 current downloads per install
    // <= 10 concurrent requests at a time.
    // this does not include api calls or component.json requests
    concurrency: concurrency.remotes
      || concurrency.remote
      || 2,
  };
  if (r === 'local') {
    // read components only locally.
    // i'm no longer sure why this is needed.
    this.remote = new remotes.Local(ro);
  } else if (!(this.remote = r)) {
    this.remote = remotes(this.constructor.remotes, ro);
    debug('remote not set - defaulting to %s',
      JSON.stringify(this.constructor.remotes));
  }

  this.channel = {
    locals: chanel({
      // local fs calls.
      // concurrency isn't really necessary here
      // since graceful-fs should handle any EMFILE errors
      concurrency: concurrency.locals || 16,
      discard: true
    }),
    dependencies: chanel({
      // concurrent GET component.json
      concurrency: concurrency.dependencies || 5,
      discard: true
    }),
    semver: chanel({
      // concurrent GET versions calls
      concurrency: concurrency.semver || 5,
      discard: true
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
  var tree = this.branch = yield* this.branchLocal(this.root, this.main);
  // local and github remotes by default
  if (!tree.remotes.length) tree.remotes.push('local', 'github');
  // wait until all the channels are clear
  var ch = this.channel;
  yield ch.locals(true);
  debug('finished resolving locals');
  yield ch.dependencies(true);
  debug('finished resolving dependencies (1)');
  // start resolving all the hanging semvers after
  // all the locals and dependencies are done.
  // not ideal as we should do this ASAP,
  // but i'm not sure how.
  this.semver();
  yield ch.semver(true);
  debug('finished resolving semver');
  // wait until all the semver dependencies are resolved
  // yeah, it's kind of weird how it's required twice
  yield ch.dependencies(true);
  debug('finished resolving dependencies(2)');
  // yield ch.installs(true);
  return tree;
}

/**
 * Vanilla JS method of `tree = yield* resolver.tree()`.
 *
 * @api public
 */

Resolver.prototype.getTree = co(Resolver.prototype.tree);

/**
 * Resolve a branch's dependency and local branches.
 *
 * @param {Object} branch
 * @api private
 */

Resolver.prototype.resolve = function (branch) {
  debug('resolving "%s"', branch.name);
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

/**
 * Get all the remotes to use in a branch's dependencies.
 *
 * @param {Object} branch
 * @return {Array} remotes
 * @api private
 */

Resolver.prototype.resolveRemotes = function (branch) {
  var remotes = branch.resolvedRemotes = [];
  do {
    var names = branch.remotes || [];
    for (var i = 0; i < names.length; i++)
      if (!~remotes.indexOf(names[i]))
        remotes.push(names[i]);
  } while (branch = branch.parent)
  return remotes;
}