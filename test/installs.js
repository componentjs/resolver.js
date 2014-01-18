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
    rimraf.sync(join(process.cwd(), 'components'))

    var resolver = new Resolver({
      dependencies: {
        'component/query': '0.0.2'
      }
    }, options)
    var tree = yield* resolver.tree()
    var dir = join(process.cwd(), 'components', 'component-query-0.0.2')
    fs.statSync(join(dir, 'index.js'))
    fs.statSync(join(dir, 'component.json'))
  }))

  it('should install simple-dependencies', co(function* () {
    var resolver = new Resolver(fixture('simple-dependencies'), options)
    var out = join(process.cwd(), 'components')
    var tree = yield* resolver.tree()
    fs.statSync(join(out, 'component-emitter-1.1.1', 'component.json'))
    fs.statSync(join(out, 'component-domify-1.1.1', 'component.json'))
  }))

  it('should install font-awesome', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'fortawesome/font-awesome': '4.0.3'
      }
    }, options)
    var out = join(process.cwd(), 'components', 'fortawesome-font-awesome-v4.0.3')
    var tree = yield* resolver.tree()
    fs.statSync(join(out, 'component.json'))
    fs.statSync(join(out, 'css', 'font-awesome.css'))
    fs.statSync(join(out, 'fonts', 'FontAwesome.otf'))
  }))
})