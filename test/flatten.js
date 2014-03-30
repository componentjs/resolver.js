var resolve = require('..')

var co = require('co')
var join = require('path').join

function fixture(name) {
  return join(__dirname, 'fixtures', name)
}

function toName(branch) {
  if (branch.type === 'local') return branch.name
  return branch.name + '@' + branch.ref
}

describe('Flatten', function () {
  it('should flatten app1', co(function* () {
    var tree = yield* resolve(fixture('app1'));
    var nodes = resolve.flatten(tree)

    nodes.map(toName).should.eql([
      'component/emitter@1.1.1',
      'component/domify@1.0.0',
      'boot',
      'app1',
    ])
  }))

  it('should flatten duplicates', co(function* () {
    var tree = yield* resolve(fixture('duplicates'));
    var nodes = resolve.flatten(tree)

    nodes.map(toName).should.eql([
      'component/indexof@0.0.3',
      'component/emitter@1.0.0',
      'component/emitter@1.0.1',
      'boot',
      'duplicates',
    ])
  }))

  it('should flatten two-path', co(function* () {
    var tree = yield* resolve(fixture('two-path'));
    var nodes = resolve.flatten(tree)

    nodes.map(toName).should.eql([
      'uno',
      'dos',
      'first',
      'second',
      'main'
    ])
  }))

  it('should detect duplicate dependencies', co(function* () {
    var tree = yield* resolve(fixture('duplicates'));
    var nodes = resolve.flatten(tree, true);

    Object.keys(nodes.duplicates['component/emitter'])
    .length.should.equal(2);
  }))
})