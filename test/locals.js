  /**
 * For local dependency resolution only.
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

describe('Locals', function () {
  it('should work with a single main', co(function* () {
    var resolver = new Resolver(fixture('simple'), options)

    var tree = yield* resolver.tree()

    tree.name.should.equal('simple')
    Object.keys(tree.dependencies).length.should.equal(0)
    Object.keys(tree.locals).length.should.equal(0)
  }))

  it('should work with a single path', co(function* () {
    var resolver = new Resolver(fixture('one-path'), options)

    var tree = yield* resolver.tree()
    tree.paths.should.have.length(1)

    tree.name.should.equal('one-path')
    tree.locals['what'].name.should.equal('what')
  }))

  it('should with two paths', co(function* () {
    var resolver = new Resolver(fixture('two-path'), options)

    var tree = yield* resolver.tree()
    tree.paths.should.have.length(2)

    var first = tree.locals['first']
    var second = tree.locals['second']

    first.name.should.equal('first')
    second.name.should.equal('second')

    var uno = first.locals['uno']
    var dos = first.locals['dos']

    uno.name.should.equal('uno')
    dos.name.should.equal('dos')

    dos.locals['uno'].should.equal(uno)

    second.locals['uno'].should.equal(uno)
    second.locals['dos'].should.equal(dos)
  }))

  it('should work with recursive paths', co(function* () {
    var resolver = new Resolver(fixture('recursive-path'), options)

    var tree = yield* resolver.tree()

    var a = tree.locals['a']
    a.paths.length.should.equal(1)
    var b = a.locals['b']

    b.path.should.equal(join(__dirname, 'fixtures', 'recursive-path', 'inner', 'b'))
  }))

  it('should guess the local\'s name if missing', co(function* () {
    var resolver = new Resolver(fixture('local-no-name'), options)
    var tree = yield* resolver.tree()

    var thing = tree.locals.thing
    thing.name.should.equal('thing')
  }))

  it('should throw if the local\'s name is incorrect', co(function* () {
    var resolver = Resolver(fixture('local-wrong-name'), options)
    try {
      var tree = yield* resolver.tree()
      throw new Error('wtf')
    } catch (err) {
      err.message.should.not.equal('wtf');
      err.message.should.containEql('name does not match the component');
    }
  }))

  it('should throw if the local is missing', co(function* () {
    var resolver = Resolver(fixture('local-missing'), options);
    try {
      var tree = yield* resolver.tree();
      throw new Error('wtf');
    } catch (err) {
      err.message.should.not.equal('wtf');
      err.message.should.containEql('Cannot resolve');
      err.message.should.containEql('local dependency');
    }
  }))
})