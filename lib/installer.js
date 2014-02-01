/**
 * Installs a repo and version to a folder.
 */

var co = require('co');
var unglob = require('unglob');
var fs = require('graceful-fs');
var join = require('path').join;
var debug = require('debug')('resolver:install');

var Resolver = require('./resolver')

/**
 * Channel wrapper
 *
 * @param {String} repo
 * @param {String} ref
 * @api private
 */

Resolver.prototype.install = function (branch) {
  this.channel.installs.push(co(this._install(branch)))
}

/**
 * Install a repo locally.
 * Won't download if a `component.json` already exists.
 *
 * @param {String} repo
 * @param {String} ref
 * @api private
 */

Resolver.prototype._install = function* (branch) {
  var repo = branch.name;
  var ref = branch.ref;
  var folder = join(this.out, repo.split('/').join('-') + '-' + ref);

  try {
    // if it already exists, we don't bother downloading
    yield stat(join(folder, 'component.json'));
    return
  } catch (err) {}

  var start = Date.now();
  var silent = this.silent;
  debug('installing %s@%s', repo, ref);
  if (!silent) {
    console.log('\033[90m  --> installing \033[96m%s@%s\033[90m...\033[0m', repo, ref);
  }

  // shouldn't be a problem as this should already be resolved
  var remote = yield* this.remote.resolve(branch.resolvedRemotes, repo, ref)
  if (!remote) throw new Error('no remote found for dependency "' + repo + '@' + ref + '".');
  var json = yield* remote.getJSON(repo, ref)

  // normalize all the relevant fields
  var fields = this.fields
  fields.forEach(function (field) {
    if (json[field]) json[field] = json[field].map(normalize)
  })

  // this is the simple case. we can just download all the files
  // without getting the git tree
  var paths = allPaths()
  if (!paths.some(hasGlob)) return yield* get();

  // wooo API call!
  // we need to the the list of files
  // so we can glob match
  // to do: make these variable names make more sense!
  var tree = (yield* remote.getTree(repo, ref)).map(toPath)

  // unglob all the fields
  fields.forEach(function (field) {
    var arr = json[field]
    if (arr) json[field] = unglob.list(arr, tree)
  })
  paths = allPaths()

  yield* get();

  function* get() {
    yield* remote.getFiles(repo, ref, paths, folder);
    // write the component.json only when the files successfully download
    // to do: don't actually move the files unless this gets written successfully as well.
    yield fs.writeFile.bind(null,
      join(folder, 'component.json'),
      JSON.stringify(json, null, 2)
    );

    var elapsed = Date.now() - start;
    debug('installed %s@%s in %sms', repo, ref, elapsed);
    if (!silent) {
      console.log('\033[90m  <-- installed  \033[96m%s@%s\033[90m \033[90min \033[33m%sms\033[0m', repo, ref, elapsed);
    }
  }

  function allPaths() {
    return fields
      .map(function (field) {
        return json[field]
      })
      .filter(Boolean)
      .reduce(concat, []);
  }
}

function stat(filename) {
  return function (done) {
    fs.stat(filename, done)
  }
}

function toPath(x) {
  return x.path
}

// remove leading ./ and /
function normalize(p) {
  return p
    .replace(/^\.\//, '')
    .replace(/^\//, '')
}

// check if any filenames are globs
function hasGlob(x) {
  return ~x.indexOf('*')
}

function concat(a, b) {
  return a.concat(b)
}