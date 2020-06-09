The dgrid project provides widgets for lists of data, including simple sets of scrolling rows,
grids of data, on-demand lazy-loaded data, and various mixins for additional functionality.

dgrid is available under the ["New" BSD License](LICENSE).

# Installation

## Install from npm

dgrid and its dependencies can be installed via [npm](https://www.npmjs.com/) using the following command:

```
npm install dgrid dojo-dstore
```

Note that by default, npm installs to a `node_modules` subdirectory.

If you are using Dojo widgets, you may want to include `dijit` and `dojox`:

```
npm install dgrid dojo-dstore dijit dojox
```

By default, npm will automatically find the highest tagged version of each component and
install it along with its dependencies.

## Manual Download

Alternatively, dgrid and its dependencies can be downloaded individually:

* [dstore](https://github.com/SitePen/dstore) >= 1.0.3 or 1.1.1, for store-backed grids
* [The Dojo Toolkit](http://dojotoolkit.org) SDK >= 1.8.2
    * Out of the DTK components, Dojo core is the only hard dependency for dgrid;
      however, some of the test pages also use components from Dijit, and
      Dojox (namely grid for a comparison test, and mobile for a mobile page).

It is recommended to arrange all dependencies as siblings, resulting in a
directory structure like the following:

* `dgrid`
* `dijit` (optional, dependency of some dgrid tests/components)
* `dojo`
* `dojox` (optional, dependency of some dgrid tests)
* `dstore`
* `util` (optional, e.g. if pursuing a custom build)

## CDN

[unpkg](https://unpkg.com/) offers CDN hosting of raw tagged git URLs.
It can serve any version of dgrid and dstore.

For example, here's a `packages` configuration for dgrid 1.1.0 and dstore 1.1.1:

```js
packages: [
    {
        name: 'dgrid',
        location: '//unpkg.com/dgrid@1.1.0/'
    },
    {
        name: 'dstore',
        location: '//unpkg.com/dojo-dstore@1.1.1/'
    }
]
```

# Browser and Dojo Version Support

dgrid works with Dojo 1.8.2 or higher, and supports the following browsers:

* IE 11 (IE8+ still unofficially supported, but no longer tested)
* Edge latest
* Firefox latest + ESR
* Chrome latest (desktop and mobile)
* Safari latest (desktop and mobile)
* Opera latest

dgrid *does not* support quirks mode.  You are *heavily* encouraged to
include the HTML5 DOCTYPE (`<!DOCTYPE html>`) at the beginning of your pages.

# Documentation

Documentation for dgrid components is available in the
[doc folder](doc).  In addition, the website hosts a number of
[tutorials](http://dgrid.io/#tutorials).

If upgrading from a previous dgrid release, please be sure to read the
[release notes on GitHub](https://github.com/SitePen/dgrid/releases).

# Community

## Reporting Issues

Bugs or enhancements can be filed by opening an issue in the
[issue tracker on GitHub](https://github.com/SitePen/dgrid/issues?state=open).

When reporting a bug, please provide the following information:

* Affected browsers and Dojo versions
* A clear list of steps to reproduce the problem
* If the problem cannot be easily reproduced in an existing dgrid test page,
  include a [Gist](https://gist.github.com/) with code for a page containing a
  reduced test case

If you would like to suggest a fix for a particular issue, you are welcome to
fork dgrid, create a branch, and submit a pull request.  Please note that a
[Dojo CLA](http://www.dojofoundation.org/about/cla) is required for any
non-trivial modifications.

## Getting Support

Questions about dgrid usage can be asked in the following places:

* [Stack Overflow](http://stackoverflow.com/questions/tagged/dgrid)
* The #dojo IRC channel on irc.freenode.net
* The [dojo-interest mailing list](http://mail.dojotoolkit.org/mailman/listinfo/dojo-interest)

Web interfaces for IRC and the mailing list are available from the
[Dojo Toolkit Community page](https://dojotoolkit.org/community/).

SitePen also offers [commercial support](https://www.sitepen.com/support/)
for dgrid, as well as Dojo and a number of other JavaScript libraries.

# Testing

See [test/README.md](test/README.md).
