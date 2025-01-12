# Espree

Espree is an actively-maintained fork Esprima, a high performance,
standard-compliant [ECMAScript](http://www.ecma-international.org/publications/standards/Ecma-262.htm)
parser written in ECMAScript (also popularly known as
[JavaScript](http://en.wikipedia.org/wiki/JavaScript)).

## Features

- Full support for ECMAScript 5.1 ([ECMA-262](http://www.ecma-international.org/publications/standards/Ecma-262.htm))
- Sensible syntax tree format compatible with Mozilla
[Parser AST](https://developer.mozilla.org/en/SpiderMonkey/Parser_API)
- Optional tracking of syntax node location (index-based and line-column)
- Heavily tested (> 650 unit tests) with full code coverage

## Usage

Install:

```
npm i espree --save
```

And in your Node.js code:

```javascript
var espree = require("espree");

var ast = espree.parse(code);
```

There is a second argument to `parse()` that allows you to specify various options:

```javascript
var espree = require("espree");

var ast = espree.parse(code, {

    // attach range information to each node
    range: true,

    // attach line/column location information to each node
    loc: true,

    // create a top-level comments array containing all comments
    comments: true,

    // attach comments to the closest relevant node as leadingComments and
    // trailingComments
    attachComment: true,

    // create a top-level tokens array containing all tokens
    tokens: true,

    // try to continue parsing if an error is encountered, store errors in a
    // top-level errors array
    tolerant: true,

    // specify parsing features (default only has blockBindings: true)
    ecmaFeatures: {

        // enable parsing of arrow functions
        arrowFunctions: true,

        // enable parsing of let/const
        blockBindings: true,

        // enable parsing of destructured arrays and objects
        destructuring: true,

        // enable parsing of regular expression y flag
        regexYFlag: true,

        // enable parsing of regular expression u flag
        regexUFlag: true,

        // enable parsing of template strings
        templateStrings: false,

        // enable parsing of binary literals
        binaryLiterals: true,

        // enable parsing of ES6 octal literals
        octalLiterals: true,

        // enable parsing unicode code point escape sequences
        unicodeCodePointEscapes: true,

        // enable parsing of default parameters
        defaultParams: false,

        // enable parsing of rest parameters
        restParams: true,

        // enable parsing of for-of statement
        forOf: true,

        // enable parsing computed object literal properties
        objectLiteralComputedProperties: true,

        // enable parsing of shorthand object literal methods
        objectLiteralShorthandMethods: true,

        // enable parsing of shorthand object literal properties
        objectLiteralShorthandProperties: true,

        // Allow duplicate object literal properties (except '__proto__')
        objectLiteralDuplicateProperties: true,

        // enable parsing of generators/yield
        generators: true,

        // support the spread operator
        spread: true,

        // enable React JSX parsing
        jsx: true,

        // enable return in global scope
        globalReturn: true
    }
});
```

## Plans

Espree starts as a fork of Esprima v1.2.2, the last stable published released of Esprima before work on ECMAScript 6 began. Espree's first version is therefore v1.2.2 and is 100% compatible with Esprima v1.2.2 as a drop-in replacement. The version number will be incremented based on [semantic versioning](http://semver.org/) as features and bug fixes are added.

The immediate plans are:

1. Move away from giant files and move towards small, modular files that are easier to manage.
1. Move towards CommonJS for all files and use browserify to create browser bundles.
1. Support ECMAScript version filtering, allowing users to specify which version the parser should work in (similar to Acorn's `ecmaVersion` property).
1. Add tests to track comment attachment.
1. Add well-thought-out features that are useful for tools developers.
1. Add full support for ECMAScript 6.
1. Add optional parsing of JSX.

## Esprima Compatibility Going Forward

The primary goal is to produce the exact same AST structure as Esprima and Acorn, and that takes precedence over anything else. (The AST structure being the SpiderMonkey Parser API with JSX extensions.) Separate from that, Espree may deviate from what Esprima outputs in terms of where and how comments are attached, as well as what additional information is available on AST nodes. That is to say, Espree may add more things to the AST nodes than Esprima does but the overall AST structure produced will be the same.

Espree may also deviate from Esprima in the interface it exposes.

## Frequent and Incremental Releases

Espree will not do giant releases. Releases will happen periodically as changes are made and incremental releases will be made towards larger goals. For instance, we will not have one big release for ECMAScript 6 support. Instead, we will implement ECMAScript 6, piece-by-piece, hiding those pieces behind an `ecmaFeatures` property that allows you to opt-in to use those features.

## Contributing

Issues and pull requests will be triaged and responded to as quickly as possible. We operate under the [ESLint Contributor Guidelines](http://eslint.org/docs/developer-guide/contributing.html), so please be sure to read them before contributing. If you're not sure where to dig in, check out the [issues](https://github.com/eslint/espree/issues).

Espree is licensed under a permissive BSD 3-clause license.

## Build Commands

* `npm test` - run all linting and tests
* `npm run lint` - run all linting
* `npm run browserify` - creates a version of Espree that is usable in a browser

## Known Incompatibilities

In an effort to help those wanting to transition from other parsers to Espree, the following is a list of noteworthy incompatibilities with other parsers. These are known differences that we do not intend to change.

### Esprima 1.2.2

* None.

### Esprima/Harmony Branch

* Esprima/Harmony uses a different comment attachment algorithm that results in some comments being added in different places than Espree. The algorithm Espree uses is the same one used in Esprima 1.2.2.
* Template tokens have a `head` property in addition to `tail`. Esprima has only `tail`.

### Esprima-FB

* All Esprima/Harmony incompatibilities.
* Esprima-FB uses the term "XJS" to refer to its JSX support. This is seen primarily in the AST node types, such as `"XJSElement"`. Espree uses "JSX" to refer to JSX functionality, including AST node types. So, `"XJSElement"` in Esprima-FB is `"JSXElement"` in Espree (and the same is true for all JSX-related node types).

## Frequently Asked Questions

### Why are you forking Esprima?

[ESLint](http://eslint.org) has been relying on Esprima as its parser from the beginning. While that was fine when the JavaScript language was evolving slowly, the pace of development has increased dramatically and Esprima has fallen behind. ESLint, like many other tools reliant on Esprima, has been stuck in using new JavaScript language features until Esprima updates, and that has caused our users frustration.

We decided the only way for us to move forward was to create our own parser, bringing us inline with JSHint and JSLint, and allowing us to keep implementing new features as we need them. We chose to fork Esprima instead of starting from scratch in order to move as quickly as possible with a compatible API.

### Have you tried working with Esprima?

Yes. Since the start of ESLint, we've regularly filed bugs and feature requests with Esprima. Unfortunately, we've been unable to make much progress towards getting our needs addressed.

### Why don't you just use Facebook's Esprima fork?

`esprima-fb` is Facebook's Esprima fork that features JSX and Flow type annotations. We tried working with `esprima-fb` in our evaluation of how to support ECMAScript 6 and JSX in ESLint. Unfortunately, we were hampered by bugs that were part of Esprima (not necessarily Facebook's code). Since `esprima-fb` tracks the Esprima Harmony branch, that means we still were unable to get fixes or features we needed in a timely manner.

### Why don't you just use Acorn?

Acorn is a great JavaScript parser that produces an AST that is compatible with Esprima. Unfortunately, ESLint relies on more than just the AST to do its job. It relies on Esprima's tokens and comment attachment features to get a complete picture of the source code. We investigated switching to Acorn, but the inconsistencies between Esprima and Acorn created too much work for a project like ESLint.

We expect there are other tools like ESLint that rely on more than just the AST produced by Esprima, and so a drop-in replacement will help those projects as well as ESLint.

### What ECMAScript 6 features do you support?

Please see the [tracking issue](https://github.com/eslint/espree/issues/10) for the most up-to-date information.

### Why use Espree instead of Esprima?

* Faster turnaround time on bug fixes
* More frequent releases
* Better communication and responsiveness to issues
* Ongoing development

### Why use Espree instead of Esprima-FB?

* Opt-in to just the ECMAScript 6 features you want
* JSX support is off by default, so you're not forced to use it to use ECMAScript 6
* Stricter ECMAScript 6 support
