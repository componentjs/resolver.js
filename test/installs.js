/**
 * For testing installing to components/
 */

var resolve = require('..')

var co = require('co')
var assert = require('assert');
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
    var tree = yield* resolve({
      dependencies: {
        'component/query': '0.0.2'
      }
    }, options);
    var dir = join(components, 'component', 'query', '0.0.2')
    fs.statSync(join(dir, 'index.js'))
    fs.statSync(join(dir, 'component.json'))
  }))

  it('should install component/classes', co(function* () {
    var tree = yield* resolve({
      dependencies: {
        'component/classes': '1.2.0',
        'component/indexof': '0.0.3',
      }
    }, options);
    fs.statSync(join(components, 'component', 'classes', '1.2.0', 'component.json'))
    fs.statSync(join(components, 'component', 'indexof', '0.0.3', 'component.json'))
  }))

  it('should install simple-dependencies', co(function* () {
    var tree = yield* resolve(fixture('simple-dependencies'), options);
    fs.statSync(join(components, 'component', 'emitter', '1.1.3', 'component.json'))
    fs.statSync(join(components, 'component', 'domify', '1.1.1', 'component.json'))
  }))

  it('should install font-awesome and not care about casing', co(function* () {
    var out = join(components, 'fortawesome', 'font-awesome', 'v4.0.3')
    var tree = yield* resolve({
      dependencies: {
        'FortAwesome/Font-Awesome': '4.0.3'
      }
    }, options);
    fs.statSync(join(out, 'component.json'))
    fs.statSync(join(out, 'css', 'font-awesome.css'))
    fs.statSync(join(out, 'fonts', 'FontAwesome.otf'))
  }))

  it('should install globs', co(function* () {
    var tree = yield* resolve({
      dependencies: {
        'component-test/glob': '0.0.1'
      }
    }, options);
    var out = join(components, 'component-test', 'glob', '0.0.1')
    fs.statSync(join(out, 'lib', 'index.js'))
    fs.statSync(join(out, 'lib', 'index.css'))
    var json = require(join(out, 'component.json'))
    json.scripts.should.eql(['lib/index.js'])
    json.styles.should.eql(['lib/index.css'])
  }))

  it('should throw when pinned dependencies are not found', co(function* () {
    try {
      yield* resolve({
        dependencies: {
          'component-test/asdfasdf': '0.0.1'
        }
      }, options);
      throw new Error('wtf');
    } catch (err) {
      err.message.should.not.equal('wtf');
      err.message.should.include('no remote found for dependency "component-test/asdfasdf@0.0.1".');
    }
  }))

  it('should throw when semver dependencies are not found', co(function* () {
    try {
      yield* resolve({
        dependencies: {
          'component-test/asdfasdf': '*'
        }
      }, options);
      throw new Error('wtf');
    } catch (err) {
      err.message.should.not.equal('wtf');
      err.message.should.include('no remote found for dependency "component-test/asdfasdf".');
    }
  }))

  it('should not install dependencies\'s dev deps during development', co(function* () {
    yield rimraf.bind(null, components);

    var tree = yield* resolve({
      dependencies: {
        'component/query': '*'
      }
    }, {
      install: true,
      development: true,
    }, options);

    assert.ok(!fs.existsSync(join(process.cwd(), 'components/component/zest')));
  }))

  it('should install component/notification@*', co(function* () {
    yield rimraf.bind(null, components);

    var tree = yield* resolve({
      dependencies: {
        'component/notification': '*'
      }
    }, {
      install: true,
    })
  }))

  it('should install component/notification@master', co(function* () {
    yield rimraf.bind(null, components);

    var tree = yield* resolve({
      dependencies: {
        'component/notification': 'master'
      }
    }, {
      install: true,
    })
  }))

  it('should fetch master for * when no tags available', co(function* () {
    yield rimraf.bind(null, components);

    var tree = yield* resolve({
      dependencies: {
        'timaschew/component-asterisk-no-tags': '*'
      }
    }, {
      install: true,
    })

    var out = join(components, 'timaschew', 'component-asterisk-no-tags', 'master')
    fs.statSync(join(out, 'index.js'))
    var json = require(join(out, 'component.json'))
    json.version.should.eql('0.0.2')
  }))

  // in the next release this should pass
  it('should fetch lastest tag for * when tags available', co(function* () {

    var tree = yield* resolve({
      dependencies: {
        'timaschew/component-asterisk-with-tags': '*'
      }
    }, {
      install: true,
    })

    var out = join(components, 'timaschew', 'component-asterisk-with-tags', '0.0.1')
    fs.statSync(join(out, 'index.js'))
    var json = require(join(out, 'component.json'))
    json.version.should.eql('0.0.1')

  }))
})