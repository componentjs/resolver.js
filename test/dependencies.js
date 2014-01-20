/**
 * For testing dependency resolution only.
 */

var Resolver = require('..')

var co = require('co')
var Remotes = require('remotes')
var github = new Remotes.GitHub
var options = {
  remote: github
}

describe('Dependencies', function () {
  it('should resolve dependencies', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component/classes': '1.1.4'
      }
    }, options)

    var tree = yield* resolver.tree()

    resolver.locals.length.should.equal(1)
    resolver.dependencies.length.should.equal(2)

    var classes = tree.dependencies['component/classes']
    classes.ref.should.equal('1.1.4')
    classes.version.should.equal('1.1.4')
    classes.dependencies['component/indexof'].should.be.ok
  }))

  it('should work with dev', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component/classes': '1.1.4'
      },
      development: {
        dependencies: {
          'component/emitter': '1.1.1'
        }
      }
    }, {
      remote: github,
      development: true
    })

    var tree = yield* resolver.tree()

    resolver.locals.length.should.equal(1)
    resolver.dependencies.length.should.equal(3)

    tree.dependencies['component/classes'].should.be.ok
    tree.dependencies['component/emitter'].should.be.ok
  }))

  // needs a better name!
  it('should recursively support semver', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component/classes': '1.1.4',
        'component/indexof': "0.0.1"
      }
    }, options)

    var tree = yield* resolver.tree()

    resolver.locals.length.should.equal(1)
    resolver.dependencies.length.should.equal(2)

    var classes = tree.dependencies['component/classes']
    classes.ref.should.equal('1.1.4')
    classes.version.should.equal('1.1.4')

    var indexof = classes.dependencies['component/indexof']
    indexof.ref.should.equal('0.0.1')
    indexof.version.should.equal('0.0.1')

    tree.dependencies['component/indexof'].should.equal(indexof)
  }))

  it('should work with semver', co(function* (){
    var resolver = new Resolver({
      dependencies: {
        'component/emitter': '> 1.1.0 < 1.1.2'
      }
    }, options)

    var tree = yield* resolver.tree()

    resolver.locals.length.should.equal(1)
    resolver.dependencies.length.should.equal(1)

    var emitter = tree.dependencies['component/emitter']
    emitter.ref.should.equal('1.1.1')
    emitter.version.should.equal('1.1.1')
  }))

  it('should work with as versions with tags with v\'s', co(function* () {
        var resolver = new Resolver({
      dependencies: {
        'suitcss/flex-embed': '1.0.0'
      }
    }, options)

    var tree = yield* resolver.tree()

    resolver.locals.length.should.equal(1)
    resolver.dependencies.length.should.equal(1)

    var embed = tree.dependencies['suitcss/flex-embed']
    embed.ref.should.equal('v1.0.0')
    embed.version.should.equal('1.0.0')
  }))

  it('should work with jonathanong/horizontal-grid-packing', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'jonathanong/horizontal-grid-packing': '<= 0.1.1'
      }
    }, options)

    var tree = yield* resolver.tree()

    resolver.locals.length.should.equal(1)
    resolver.dependencies.length.should.equal(4)

    var hgp = tree.dependencies['jonathanong/horizontal-grid-packing']
    hgp.version.should.equal('0.1.1')

    hgp.dependencies['math-utils/linear-partitioning'].should.be.ok
    hgp.dependencies['component/classes'].should.be.ok
  }))

  it('should resolve multiple nested semver deps', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'yields/select': '0.5.1',
        'component/pillbox': '1.3.1'
      }
    }, options)

    var tree = yield* resolver.tree()
  }))

  it('should resolve mixed-case deps', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'visionmedia/superagent': '0.16.0'
      }
    }, options)

    var tree = yield* resolver.tree()

    var deps = tree.dependencies['visionmedia/superagent'].dependencies
    deps.should.not.have.property('RedVentures/reduce')
    deps['redventures/reduce'].type.should.equal('dependency')
  }))
})