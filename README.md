# component-resolver [![Build Status](https://travis-ci.org/component/resolver.js.png)](https://travis-ci.org/component/resolver.js)

Resolve a component's dependency tree.

- Relies on components' newer [specs](https://github.com/component/spec)
- Validates and normalizes `component.json`s
- Supports installing
- Supports globs
- Supports semver

This uses:

- [remotes](https://github.com/component/remotes.js)
- [downloader](https://github.com/component/downloader.js)
- [flatten](https://github.com/component/flatten.js)

## Example

```js
var Resolver = require('component-resolver')

var resolver = new Resolver({
  // a "component.json"
  dependencies: {
    'component/emitter': '1.1.1'
  }
});

resolver.getTree(function (err, tree) {
  if (err) throw err;

  tree.dependencies['component/emitter']
  /**
   * name: 'component/emitter'
   * version: '1.1.1'
   * ref: '1.1.1'
   */

   // flatten the dependency tree
   var nodes = resolver.flatten(tree)
   nodes[0].name === 'component/emitter'
})
```

## API

### var resolver = new Resolver(component, options)

`component` can either be a "root" folder. If `null`, it's `process.cwd()`. `component` can also be "component.json" object. This is useful for resolving dependencies without reading anything from disk.

The main `options` are:

- `root` <process.cwd()> - if `component.json` is an object, this will set the root.
- `remote` <`['local', 'github']`> - a `remotes` instance
- `dev` <false> - include `development` in `local` components
- `deps` <true> - resolve dependencies
- `verbose` <false> - print warnings
- `concurrency` <{}> - an object with concurrency values for different channels. Defaults:

    - `locals: 16`
    - `dependencies: 5`
    - `semver: 5`
    - `installs: 5`
    - `downloads: 1`

Options passed to `component-downloader`:

- `install` <false> - install components to `out`
- `dir` <`components`> - folder to install components to
- `fields`
- `archive`

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

### resolver.getTree(callback)

The non-generator version of `yield* resolver.tree()`.

### var nodes = resolver.flatten(tree)

Flattens a tree for building in the proper dependency order. You can also manipulate the tree if you'd like. Read more about [component-flatten](https://github.com/component/flatten.js).

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