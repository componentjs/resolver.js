/**
 * Installs a repo and version to a folder.
 */

var co = require('co')
var minimatch = require('minimatch')
var fs = require('graceful-fs')
var join = require('path').join

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
  var repo = branch.name
  var ref = branch.ref
  var folder = join(this.out, repo.split('/').join('-') + '-' + ref)

  try {
    // if it already exists, we don't bother downloading
    yield stat(join(folder, 'component.json'))
    return
  } catch (err) {}

  // shouldn't be a problem as this should already be resolved
  var remote = yield* this.remote.resolve(branch.resolvedRemotes, repo, ref)
  if (!remote) throw new Error('wtf')
  var json = yield* remote.getJSON(repo, ref)

  // we flatten the list of files into a single "paths"
  var fields = this.fields
  var paths = fields
  .map(function (field) {
    return json[field]
  })
  .filter(Boolean)
  .reduce(concat, [])
  .map(normalize)

  // this is the simple case. we can just download all the files
  // without getting the git tree
  if (!paths.some(hasGlob)) {
    yield* remote.getFiles(repo, ref, paths, folder)
    yield writeJSON
    return
  }

  // wooo API call!
  // we need to the the list of files
  // so we can glob match
  // to do: make these variable names make more sense!
  var tree = (yield* remote.getTree(repo, ref)).map(toPath)
  var files = [] // files to download

  // we then go through the fields and example all the globs.
  // one. by. one
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i]
    var arr = json[field]
    if (!arr || !arr.length) continue
    arr = arr.map(normalize)
    for (var j = 0; j < arr.length; j++) {
      var filename = arr[j]
      if (!hasGlob(filename)) continue
      // creates a nested array
      arr[j] = minimatch.match(tree, filename, {})
    }
    // flatten the array
    // we also overwrite the component.json
    // since we don't want to resolve this over again
    arr = json[field] = flatten(arr)
    files = files.concat(arr)
  }

  yield* remote.getFiles(repo, ref, files, folder)
  yield writeJSON

  // write the component.json only when the files successfully download
  // to do: don't actually move the files unless this gets written successfully as well.
  function writeJSON(done) {
    fs.writeFile(
      join(folder, 'component.json'),
      JSON.stringify(json, null, 2),
      done
    )
  }
}

function flatten(arr, out) {
  out = out || []
  arr.forEach(function (val) {
    if (Array.isArray(val)) flatten(val, out)
    else out.push(val)
  })
  return out
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