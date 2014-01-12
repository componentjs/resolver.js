/**
 * For testing installing to components/
 */

var Resolver = require('..')

var co = require('co')
var rimraf = require('rimraf')
var Remotes = require('remotes')
var join = require('path').join
var fs = require('fs')
var github = new Remotes.GitHub
var options = {
  install: true,
  remote: github
}

function fixture(name) {
  return join(__dirname, 'fixtures', name)
}

describe('Installer', function () {
  it('should install stuff', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component/query': '0.0.2'
      }
    }, options)

    var tree = yield* resolver.tree()

    var dir = join(process.cwd(), 'components', 'component-query-0.0.2')
    fs.statSync(join(dir, 'index.js'))
    fs.statSync(join(dir, 'component.json'))

    rimraf.sync(dir)
  }))

  it('should install simple-dependencies', co(function* () {
    var resolver = new Resolver(fixture('simple-dependencies'), options)

    var out = join(process.cwd(), 'components')

    var tree = yield* resolver.tree()
    fs.statSync(join(out, 'component-emitter-1.1.1', 'component.json'))
    fs.statSync(join(out, 'component-domify-1.1.1', 'component.json'))

    rimraf.sync(out)
  }))
})