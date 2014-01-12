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

Resolver.prototype.install = co(function* (branch) {
  var ch = this.channel.installs
  yield* ch.drain()
  this._install(branch, ch.push())
})

/**
 * Install a repo locally.
 * Won't download if a `component.json` already exists.
 *
 * @param {String} repo
 * @param {String} ref
 * @api private
 */

Resolver.prototype._install = co(function* (branch) {
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
  var tree = yield* remote.getTree(repo, ref)
  var files = tree.map(toPath)
  var json = yield* remote.getJSON(repo, ref)
  var files = []
  // to do: move this whole shit to a separate function
  for (var i = 0; i < this.fields.length; i++) {
    var field = this.fields[i]
    var arr = json[field]
    if (!arr || !arr.length) continue
    // first we expland blobs
    for (var j = 0; j < arr.length; j++) {
      // remove leading `./` and `/`s
      var filename = arr[j] = arr[j]
        .replace(/^\.\//, '')
        .replace(/^\//, '')
      // expand the glob
      if (~filename.indexOf('*'))
        arr[j] = minimatch.match(files, filename)
    }
    // flatten the array
    json[field] = flatten(json[field])
    // actually filter the files now
    for (var k = 0; k < arr.length; k++)
      if (!~files.indexOf(arr[k])) files.push(arr[k])
  }
  // filter tree by files in the list
  // to do: throw if any files do not exist in the tree
  tree = tree.filter(function (obj) {
    return ~files.indexOf(obj.path)
  })
  yield* remote.getFiles(repo, ref, tree, folder)
  yield function (done) {
    // write the component.json only when the files successfully download
    // to do: don't actually move the files unless this gets written successfully as well.
    fs.writeFile(
      join(folder, 'component.json'),
      JSON.stringify(json, null, 2),
      done
    )
  }
})

function flatten(arr, out) {
  out = out || []
  arr.forEach(function (val) {
    if (Array.isArray(val)) flatten(val, out)
    else out.push(val)
  })
  return out
}

function toPath(x) {
  return x.path
}

function stat(filename) {
  return function (done) {
    fs.stat(filename, done)
  }
}