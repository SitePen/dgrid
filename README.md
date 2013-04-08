This project provides widgets for lists of data, including simple sets of scrolling rows,
grids of data, on-demand lazy-loaded data, and various plugins for additional functionality. 
This project also provides touch scrolling for mobile devices with native style
momentum, bouncing, and scrollbars.

The dgrid project is available under the same dual BSD/AFLv2 license as the Dojo Toolkit.

# Installation

## Automatic Download with CPM

dgrid can be installed via [CPM](https://github.com/kriszyp/cpm)
using the following command:

    cpm install dgrid

The above command will automatically find the highest tagged version of dgrid and
install it.  Alternatively, the latest development version of dgrid can be
installed by instructing CPM to install from the master branch:

    cpm install dgrid master

Note that while dgrid lists the dojo package as a dependency, it does not install
dijit, as it is not a hard requirement.  Dijit can be additionally installed by
running:

    cpm install dijit

## Manual Download

Alternatively, dgrid and its dependencies can be downloaded individually:

* [xstyle](https://github.com/kriszyp/xstyle)
* [put-selector](https://github.com/kriszyp/put-selector)
* [The Dojo Toolkit](http://dojotoolkit.org) SDK version 1.7 or higher
    * Out of the DTK components, Dojo core is the only hard dependency for dgrid;
      however, some of the test pages also use components from Dijit, and
      Dojox (namely grid for a comparison test, and mobile for a mobile page).

It is recommended to arrange all dependencies as siblings, resulting in a
directory structure like the following:

* `dgrid`
* `dijit` (optional, dependency of some dgrid tests)
* `dojo`
* `dojox` (optional, dependency of some dgrid tests)
* `put-selector`
* `xstyle`
* `util` (optional, e.g. if pursuing a custom build)

dgrid works best with the latest revision of Dojo 1.7 or higher.  As of this
writing, [Dojo 1.8.1](http://download.dojotoolkit.org/release-1.8.1/) is
recommended.

Note that while dgrid supports Dojo 1.8 and may take advantage of features or
fix issues specific to it where possible, it does not have any hard dependency
on APIs new to 1.8, so as to maintain compatibility with 1.7.

# Documentation

Documentation for dgrid components is available in the
[dgrid GitHub project wiki](https://github.com/SitePen/dgrid/wiki).
The wiki's content may still be obtained for offline reading by cloning
the wiki repository, as indicated under the "Git Access" tab.

In addition to the documentation on the wiki, if upgrading from a previous
dgrid release, please be sure to read the changelog, found in CHANGES.md.

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

Questions about dgrid usage can be discussed on the
[dojo-interest mailing list](http://mail.dojotoolkit.org/mailman/listinfo/dojo-interest)
or in the #dojo IRC channel on irc.freenode.net. Web interfaces are available
from the [Dojo Toolkit Community page](https://dojotoolkit.org/community/).

SitePen also offers [commercial support](https://www.sitepen.com/support/)
for dgrid, as well as Dojo and a number of other JavaScript libraries.