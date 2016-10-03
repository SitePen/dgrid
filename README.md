The dgrid project provides widgets for lists of data, including simple sets of scrolling rows,
grids of data, on-demand lazy-loaded data, and various mixins for additional functionality.

dgrid is available under the ["New" BSD License](LICENSE).

# Installation

## Bower

dgrid and its dependencies can be installed via [Bower](http://bower.io/) using the following command:

```
bower install dgrid
```

Note that by default, Bower installs to a `bower_components` subdirectory.  If you'd
like to install to the current directory instead (which tends to be more appropriate
for AMD projects), add a `.bowerrc` with the following:

```json
{
    "directory": "."
}
```

By default, Bower will automatically find the highest tagged version of dgrid and
install it along with its dependencies.  Alternatively, the latest development version of dgrid can be
installed by instructing Bower to install from the master branch:

```
bower install dgrid#master
```

Note that while dgrid lists the `dojo` package as a dependency, it will not automatically
install `dijit`, as it is not a hard requirement.  Dijit can be additionally installed by
running:

```
bower install dijit#<target>
```

...where `<target>` corresponds to the version of Dojo you have installed.

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

## npm

As of version 1.1.0, dgrid can also be [retrieved via npm](doc/usage/npm.md),
but using Bower is recommended as it is more straightforward.

## CDN

[RawGit](http://rawgit.com/) now offers CDN hosting of raw tagged git URLs.
It can serve any version of dgrid and dstore via MaxCDN.

For example, here's a `packages` configuration for dgrid 1.1.0 and dstore 1.1.1:

```js
packages: [
    {
        name: 'dgrid',
        location: '//cdn.rawgit.com/SitePen/dgrid/v1.1.0'
    },
    {
        name: 'dstore',
        location: '//cdn.rawgit.com/SitePen/dstore/v1.1.1'
    }
]
```

# Browser and Dojo Version Support

dgrid works with Dojo 1.8.2 or higher, and supports the following browsers:

* IE 9+ (IE8 still unofficially supported, but no longer tested)
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

dgrid uses [Intern](http://theintern.io/) as its test runner. Tests can
either be run using the browser, or using a cloud provider such as
[BrowserStack](https://www.browserstack.com/) or [Sauce Labs](https://saucelabs.com/).
More information on writing your own tests with Intern can be found in the
[Intern user guide](https://theintern.github.io/intern/).

*Note that installing dgrid via Bower will not include the test folder; if you
wish to run dgrid's unit tests, download the package directly.*

## Setting up

**Note:** Commands listed in this section are all written assuming they are
run inside the `dgrid` directory.

Run `npm install` to install Intern:

```
npm install
```

## Running via the browser

1. Open a browser to http://hostname/path_to_dgrid/test/intern/runTests.html
2. View the console

## Running via BrowserStack or Sauce Labs

Make sure the proper credentials are set in the environment:

```
# for BrowserStack:
export BROWSERSTACK_USERNAME=<your_browserstack_username>
export BROWSERSTACK_ACCESS_KEY=<your_browserstack_access_key>

# for Sauce Labs:
export SAUCE_USERNAME=<your_sauce_username>
export SAUCE_ACCESS_KEY=<your_sauce_access_key>
```

Then kick off the runner with the following command:

```
# for BrowserStack:
grunt intern:browserstack

# for Sauce Labs:
grunt intern:saucelabs
```

## Running via local Selenium server

### Windows

Obtain the latest version of the Selenium server and the IE driver server from
[Selenium's Download page](http://docs.seleniumhq.org/download/).  (The IE driver server needs to be
placed in a folder on your PATH.)

The Selenium server can be started by executing:

```
java -jar path\to\selenium-server-standalone-<version>.jar
```

### Mac OS X

The easiest way to obtain the Selenium standalone server for Mac OS X is by
using [Homebrew](http://brew.sh/).  Once Homebrew is installed, run the following
commands:

```sh
brew update # ensure you have the latest formulae
brew install selenium-server-standalone
brew install chromedriver # for automating tests in Chrome
```

`selenium-server-standalone` installs a `selenium-server` script
which can be used to start up the server.  For additional information
(e.g. how to start the server at login), see the output of
`brew info selenium-server-standalone`.

### Running the tests

Once the Selenium server is running, kick off the Intern test runner with the following command:

```
grunt test
```

This runs the `intern:local` Grunt task, which uses the configuration in `intern-local.js`.
This configuration overrides `intern.js` to use `NullTunnel`, and to test in Chrome by default
(this can be customized as desired according to the browsers you have installed).
