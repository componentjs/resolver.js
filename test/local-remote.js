/**
 * Using local as a remote, specifically for the builder.
 */

var Resolver = require('..')

var co = require('co')
var rimraf = require('rimraf')
var Remotes = require('remotes')
var join = require('path').join
var fs = require('fs')
var github = new Remotes.GitHub
var options = {
  install: true,
  remote: github
}

describe('Remote Local', function () {
  it('should install stuff', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component/query': '0.0.2'
      }
    }, options)

    var tree = yield* resolver.tree()
  }))

  it('should resolve components from local', co(function* () {
    var resolver = new Resolver({
      dependencies: {
        'component/query': '0.0.2'
      }
    }, {
      remote: 'local'
    })

    var tree = yield* resolver.tree()

    tree.dependencies['component/query'].version.should.equal('0.0.2')
  }))

  it('should cleanup', function (done) {
    rimraf(join(process.cwd(), 'components', 'component-query-0.0.2'), done)
  })
})