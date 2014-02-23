/**
 * Put any tests you don't know where else to put here!
 */

var resolve = require('..')

var co = require('co')
var join = require('path').join

function fixture(name) {
  return join(__dirname, 'fixtures', name)
}

describe('Resolver', function () {
  describe('app1', function () {
    var tree;
    var branches;

    it('should resolve', co(function* () {
      tree = yield* resolve(fixture('app1'));
      branches = resolve.flatten(tree);

      branches.length.should.equal(4);

      tree.name.should.equal('app1')
      tree.dependencies['component/emitter'].version.should.equal('1.1.1')

      var boot = tree.locals['boot']
      boot.dependencies['component/domify'].version.should.equal('1.0.0')
    }))

    it('should have canonical names', co(function* () {
      branches[0].canonical.should.equal('component/emitter@1.1.1');
      branches[1].canonical.should.equal('component/domify@1.0.0');
      branches[2].canonical.should.equal('./lib/boot');
      branches[3].canonical.should.equal('./app1');
    }))
  })

  it('should work with duplicates', co(function* () {
    var tree = yield* resolve(fixture('duplicates'));
    var boot = tree.locals['boot'];

    resolve.flatten(tree).length.should.equal(5);

    tree.dependencies['component/emitter'].version.should.equal('1.0.1')

    boot.dependencies['component/emitter'].version.should.equal('1.0.0')

    boot.dependencies['component/emitter']
    .should.not.equal(tree.dependencies['component/emitter'])
  }))
})