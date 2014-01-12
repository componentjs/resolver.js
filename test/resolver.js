/**
 * Put any tests you don't know where else to put here!
 */

var Resolver = require('..')

var co = require('co')
var Remotes = require('remotes')
var join = require('path').join

var options = {
  remote: new Remotes.GitHub
}

function fixture(name) {
  return join(__dirname, 'fixtures', name)
}

describe('Resolver', function () {
  it('should resolve app1', co(function* () {
    var resolver = new Resolver(fixture('app1'), options)

    var tree = yield* resolver.tree()

    resolver.locals.length.should.equal(2)
    resolver.dependencies.length.should.equal(2)

    tree.name.should.equal('app1')
    tree.dependencies['component/emitter'].version.should.equal('1.1.1')

    var boot = tree.locals['boot']
    boot.dependencies['component/domify'].version.should.equal('1.0.0')
  }))

  it('should work with duplicates', co(function* () {
    var resolver = new Resolver(fixture('duplicates'), options)

    var tree = yield* resolver.tree()
    var boot = tree.locals['boot']

    resolver.locals.length.should.equal(2)
    resolver.dependencies.length.should.equal(3)

    tree.dependencies['component/emitter'].version.should.equal('1.0.1')

    boot.dependencies['component/emitter'].version.should.equal('1.0.0')

    boot.dependencies['component/emitter']
    .should.not.equal(tree.dependencies['component/emitter'])
  }))
})