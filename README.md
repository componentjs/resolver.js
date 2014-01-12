# component-resolver [![Build Status](https://travis-ci.org/component/resolver.js.png)](https://travis-ci.org/component/resolver.js)

Resolve a component's dependency tree. Also optionally installs components (because it's only a few more lines).

Relies on component's newer specs. Handles globs and semver.

## Example

```js
var Resolver = require('component-resolver')
var Remotes = require('remotes')
var remotes = new Remotes()
remotes.use(Remotes.GitHub({
  auth: 'jonathanong:password'
}))

co(function* () {
  var resolver = new Resolver({
    dependencies: {
      'component/emitter': '1.1.1'
    }
  }, {
    remote: remotes
  })

  var tree = yield* resolver.tree()

  tree.dependencies['component/emitter']
  /**
   * name: 'component/emitter'
   * version: '1.1.1'
   * ref: '1.1.1'
   */

   var nodes = resolver.flatten(tree)
   nodes[0].name === 'component/emitter'
})
```

## API

### new Resolver(component, options)

`component` can either be a "root" folder. If `null`, it's `process.cwd()`. `component` can also be "component.json" object. This is useful for resolving dependencies without reading anything from disk.

`options` is not optional! The `options` are:

- `root` <process.cwd()> - if `component.json` is an object, this will set the root.
- `dev` <false> - include `development` in `local` components
- `deps` <true> - resolve dependencies
- `remote` - this is required. It can either be `'local'` to resolve from locally downloaded components, specifically for use with a builder, a group of remotes as a `Remotes` instance, or a single `Remote` instance.
- `fields` - fields to check for files to download. By default, these are:
  - `scripts`
  - `styles`
  - `templates`
  - `json`
  - `fonts`
  - `images`
  - `files`
- `out` <components> - folder to install components to. resolves against `process.cwd()`.

### var tree = yield* resolver.tree()

Returns the dependency tree. There are two types of nodes: `local` for local components and `dependency` for remote components. Properties:

- `type` - either `local` or `dependency`
- `name`
- `dependencies` {}
- `node`: the node's `component.json`

Local components have:

- `locals` {}
- `path` - the path of the component, not including `/component.json`
- `paths` - absolute `.paths` of this component
- `remotes` - NOT YET IMPLEMENTED

Dependencies have:

- `ref` - git reference such as `master`, `v1.0.0`, etc.
- `version` - the semantic version, if any

### var nodes = resolver.flatten(tree, [filter])

Flattens a tree, ideal for building. You can also manipulate the tree if you'd like. The optional `filter` function allows you to include or exclude nodes, particularly for multiple builds. The default `filter` is `function () { return true }` which includes everything.

## License

The MIT License (MIT)

Copyright (c) 2014 Jonathan Ong me@jongleberry.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.