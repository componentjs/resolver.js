/**
 * For testing installing to components/
 */

var Resolver = require('..')

var co = require('co')
var rimraf = require('rimraf')
var join = require('path').join
var fs = require('fs')
var options = {
  install: true,
}
var components = join(process.cwd(), 'components')

function fixture(name) {
  return join(__dirname, 'fixtures', name)
}

describe('Installer', function () {
  before(function (done) {
    rimraf(components, done)
  })

  it('should install stuff', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component/query': '0.0.2'
      }
    }, options)
    var tree = yield* resolver.tree()
    var dir = join(components, 'component', 'query', '0.0.2')
    fs.statSync(join(dir, 'index.js'))
    fs.statSync(join(dir, 'component.json'))
  }))

  it('should install component/classes', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component/classes': '1.2.0',
        'component/indexof': '0.0.3',
      }
    }, options)
    var tree = yield* resolver.tree()
    fs.statSync(join(components, 'component', 'classes', '1.2.0', 'component.json'))
    fs.statSync(join(components, 'component', 'indexof', '0.0.3', 'component.json'))
  }))

  it('should install simple-dependencies', co(function* () {
    var resolver = new Resolver(fixture('simple-dependencies'), options)
    var tree = yield* resolver.tree()
    fs.statSync(join(components, 'component', 'emitter', '1.1.2', 'component.json'))
    fs.statSync(join(components, 'component', 'domify', '1.1.1', 'component.json'))
  }))

  it('should install font-awesome and not care about casing', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'FortAwesome/Font-Awesome': '4.0.3'
      }
    }, options)
    var out = join(components, 'fortawesome', 'font-awesome', 'v4.0.3')
    var tree = yield* resolver.tree()
    fs.statSync(join(out, 'component.json'))
    fs.statSync(join(out, 'css', 'font-awesome.css'))
    fs.statSync(join(out, 'fonts', 'FontAwesome.otf'))
  }))

  it('should install globs', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component-test/glob': '0.0.1'
      }
    }, options)
    var tree = yield* resolver.tree()
    var out = join(components, 'component-test', 'glob', '0.0.1')
    fs.statSync(join(out, 'lib', 'index.js'))
    fs.statSync(join(out, 'lib', 'index.css'))
    var json = require(join(out, 'component.json'))
    json.scripts.should.eql(['lib/index.js'])
    json.styles.should.eql(['lib/index.css'])
  }))

  it('should throw when pinned dependencies are not found', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component-test/asdfasdf': '0.0.1'
      }
    }, options);

    try {
      yield* resolver.tree();
      throw new Error('wtf');
    } catch (err) {
      err.message.should.not.equal('wtf');
      err.message.should.equal('no remote found for dependency "component-test/asdfasdf@0.0.1".');
    }
  }))

  it('should throw when semver dependencies are not found', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component-test/asdfasdf': '*'
      }
    }, options);

    try {
      yield* resolver.tree();
      throw new Error('wtf');
    } catch (err) {
      err.message.should.not.equal('wtf');
      err.message.should.equal('no remote found for dependency "component-test/asdfasdf".');
    }
  }))
})