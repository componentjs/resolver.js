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

function toName(branch) {
  if (branch.type === 'local') return branch.name
  return branch.name + '@' + branch.ref
}

describe('Flatten', function () {
  it('should flatten app1', co(function* () {
    var resolver = new Resolver(fixture('app1'), options)

    var tree = yield* resolver.tree()
    var nodes = resolver.flatten(tree)

    nodes.map(toName).should.eql([
      'component/emitter@1.1.1',
      'component/domify@1.0.0',
      'boot',
      'app1',
    ])
  }))

  it('should flatten duplicates', co(function* () {
    var resolver = new Resolver(fixture('duplicates'), options)

    var tree = yield* resolver.tree()
    var nodes = resolver.flatten(tree)

    nodes.map(toName).should.eql([
      'component/indexof@0.0.2',
      'component/emitter@1.0.0',
      'component/emitter@1.0.1',
      'boot',
      'duplicates',
    ])
  }))

  it('should flatten two-path', co(function* () {
    var resolver = new Resolver(fixture('two-path'), options)

    var tree = yield* resolver.tree()
    var nodes = resolver.flatten(tree)

    nodes.map(toName).should.eql([
      'uno',
      'dos',
      'first',
      'second',
      'main'
    ])
  }))

  it('should detect duplicate dependencies', co(function* () {
    var resolver = new Resolver(fixture('duplicates'), options);

    var tree = yield* resolver.tree();
    var nodes = resolver.flatten(tree, true);

    Object.keys(nodes.duplicates['component/emitter'])
    .length.should.equal(2);
  }))

  it('should detect conflicting local names', co(function* () {
    var resolver = new Resolver(fixture('conflicts'), options);

    var tree = yield* resolver.tree();
    var nodes = resolver.flatten(tree, true);

    nodes.conflicts.name.length.should.equal(2);
  }))
})