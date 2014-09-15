  /**
 * For local dependency resolution only.
 */

var resolve = require('..')

var co = require('co')
var join = require('path').join

function fixture(name) {
  return join(__dirname, 'fixtures', name)
}

describe('Locals', function () {
  it('should allow resolving a component below root', co(function* () {
    try {
      var tree = yield* resolve(fixture('below-root'));
      tree.name.should.equal('below-root')
    } catch(err){
      err.should.equal(null);
    }
  }))

  it('should work with a single main', co(function* () {
    var tree = yield* resolve(fixture('simple'));

    tree.name.should.equal('simple')
    Object.keys(tree.dependencies).length.should.equal(0)
    Object.keys(tree.locals).length.should.equal(0)
  }))

  it('should work with a single path', co(function* () {
    var tree = yield* resolve(fixture('one-path'));

    tree.paths.should.have.length(1)
    tree.name.should.equal('one-path')

    var what = tree.locals['what']
    what.name.should.equal('what')
    what.dependents.should.include(tree)
  }))

  it('should with two paths', co(function* () {
    var tree = yield* resolve(fixture('two-path'));

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
    var tree = yield* resolve(fixture('recursive-path'));

    var a = tree.locals['a']
    a.paths.length.should.equal(1)
    var b = a.locals['b']

    b.path.should.equal(join(__dirname, 'fixtures', 'recursive-path', 'inner', 'b'))
  }))

  it('should guess the local\'s name if missing', co(function* () {
    var tree = yield* resolve(fixture('local-no-name'));

    var thing = tree.locals.thing
    thing.name.should.equal('thing')
  }))

  it('should throw if the local\'s name is incorrect', co(function* () {
    try {
      var tree = yield* resolve(fixture('local-wrong-name'));
      throw new Error('wtf')
    } catch (err) {
      err.message.should.not.equal('wtf');
      err.message.should.containEql('name does not match the component');
    }
  }))

  it('should throw if the local is missing', co(function* () {
    try {
      var tree = yield* resolve(fixture('local-missing'));
      throw new Error('wtf');
    } catch (err) {
      err.message.should.not.equal('wtf');
      err.message.should.containEql('Cannot resolve');
      err.message.should.containEql('local dependency');
    }
  }))

  it('should work with old .local', co(function* () {
    var tree = yield* resolve(fixture('old-local'));
    tree.locals.boot.should.be.ok;
  }))

  it('should have normalized canonical path separators', co(function* () {
    var tree = yield* resolve(fixture('one-path'));

    tree.paths.should.have.length(1)
    tree.name.should.equal('one-path')

    var what = tree.locals['what']
    what.canonical.should.equal('./stuff/what')
  }))

})