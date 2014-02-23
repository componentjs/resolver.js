/**
 * Put any tests you don't know where else to put here!
 */

var Resolver = require('..')

var co = require('co')
var join = require('path').join

var options = {}

function fixture(name) {
  return join(__dirname, 'fixtures', name)
}

describe('Resolver', function () {
  describe('app1', function () {
    var resolver;
    var tree;

    it('should resolve', co(function* () {
      resolver = new Resolver(fixture('app1'), options)

      tree = yield* resolver.tree()

      resolver.locals.length.should.equal(2)
      resolver.dependencies.length.should.equal(2)

      tree.name.should.equal('app1')
      tree.dependencies['component/emitter'].version.should.equal('1.1.1')

      var boot = tree.locals['boot']
      boot.dependencies['component/domify'].version.should.equal('1.0.0')
    }))

    it('should have canonical names', co(function* () {
      var branches = resolver.flatten(tree);

      branches[0].canonical.should.equal('component/emitter@1.1.1');
      branches[1].canonical.should.equal('component/domify@1.0.0');
      branches[2].canonical.should.equal('./lib/boot');
      branches[3].canonical.should.equal('./app1');
    }))
  })

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