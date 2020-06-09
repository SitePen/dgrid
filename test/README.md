# dgrid tests

> Note: installing dgrid via npm will not include the test folder; if you wish to run dgrid's unit tests, clone the
dgrid repository or download the package directly

dgrid includes both manual test pages and automated test pages. All tests require a specific folder structure:

```
/
    dgrid/
    dijit/
    dojo/
    dstore/
```

## Supporting scripts

* `npm run serve`: start an HTTP server ([http-serve](https://www.npmjs.com/package/http-serve)) rooted in the parent folder of dgrid on port 8080
  * `npm run serve -- --port=80`: run the HTTP server on port 80
* `npm run serve-rest`: start a [REST server](data/rest-node.js) on port 8040 useful in some tests
(`Rest.html`, `extensions/Pagination_Tree.html`)
  * Edit [`data/rest-node.js`](data/rest-node.js) if you need to change the port number

## Manual tests

Manual test files are useful for testing individual features and understanding how to configure dgrid. Manual tests are
in the HTML files within the `test` and `test/extensions` folders.

## Automated tests

dgrid's test suite is written and configured to run with [Intern](https://theintern.io/). Unit tests can be run both
directly in a web browser and using WebDriver. Functional tests will only run with WebDriver.

## Running dgrid tests

### Full test suite with WebDriver & BrowserStack

Requirements:

* Node.js and npm installed
* dgrid dependencies installed (`npm install`)
* Active BrowserStack account and `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` environment variables set

```bash
> npx intern config=@browserstack
```

This will run Intern with the `"browserstack"` config from `intern.json`. Intern will run a local HTTP server to
serve dgrid test files to BrowserStack via Intern's DigDug proxy tunnel. The code in functional test suites will
run in the local Node.js environment. The remote control commands in the tests are sent to the remote browser via
Intern's WebDriver library, Leadfoot.

## Developing and debugging dgrid tests

> Tip: Use `grep` to run specific tests

The easiest way to debug tests is by running them from a local HTTP server in a local web browser. Opening
`dgrid/test/intern/runTests.html` will redirect you to Intern's test runner. By default this will run all of dgrid's
unit tests. While tests are running the DOM will be manipulated by tests and real-time test status is output to the
developer console. After the tests have completed Intern will replace the page DOM with the Intern Test Report.

You can click on any suite or test in the Intern Test Report to re-run specific tests. Doing so will add the
`grep` parameter to the URL's query string. You can specify your own value for `grep` to run only tests whose suite
name or test name match the value. Refer to the Intern documentation to see other Intern configuration values that
can be set in the query string.

### Functional tests

Intern's `selenium` tunnel will automatically download [Selenium](https://www.selenium.dev/) and necessary WebDriver
servers and is the recommended approach. It is also possible to use Intern's `null` tunnel and manually run Selenium
or browser-specific WebDriver servers.

dgrid's [Intern configuration](../intern.json) includes configs for several browsers that can be specified on the
command-line:

```bash
> npx intern config=@chrome
```

Browser configs: `chrome`, `firefox`, `safari`, `edge`, `ie`

### Leaving the test browser open

dgrid's Intern configuration will leave the test browser open only if one or more tests fail. You can change
`leaveRemoteOpen` on the command line:

```bash
> npx intern config=@chrome leaveRemoteOpen=true
```

The `pretty` reporter may erase errors that are output to the console. You can use the `runner` reporter while debugging
failures:

```bash
> npx intern config=@chrome reporters=runner
```

### Loader errors

Loader errors, both from Dojo's AMD loader and from Node.js' `require` may produce confusing output that does not
facilitate debugging. If you encounter a loader error carefully inspect all your imports and ensure that they are
correct. Loader errors are typically caused by invalid module ids, invalid module files, or errors being thrown in a
module being loaded.

<details>
	<summary>Expand to see example console output resulting from a loader error</summary>

```bash
Listening on localhost:9000 (ws 9001)
Tunnel started
Error: timeout
    at makeError (D:\dev\src\dojo\dojo\dojo.js:129:15)
    at Timeout.<anonymous> (D:\dev\src\dojo\dojo\dojo.js:1687:20)
    at listOnTimeout (internal/timers.js:549:17)
    at processTimers (internal/timers.js:492:7) {
  src: 'dojoLoader',
  info: {
    'dgrid/test/intern/functional/Editor': 1,
    'D:/dev/src/dojo//dgrid/test/intern/functional/Editor.js': { main: 'main', name: 'dgrid', location: 'dgrid' }
  }
}
src: dojoLoader
info: {
  'dgrid/test/intern/functional/Editor': 1,
  'D:/dev/src/dojo//dgrid/test/intern/functional/Editor.js': { main: 'main', name: 'dgrid', location: 'dgrid' }
}
.
(ノಠ益ಠ)ノ彡┻━┻
Error: timeout
  at makeError @ ..\dojo\dojo.js:129:15
  at Timeout.<anonymous> @ ..\dojo\dojo.js:1687:20
  at listOnTimeout @ internal\timers.js:549:17
  at processTimers @ internal\timers.js:492:7
(ノಠ益ಠ)ノ彡┻━┻
Error: Dojo loader error: timeout
  @ src\loaders\dojo.ts:37:17
  @ ..\dojo\dojo.js:392:14
  at forEach @ ..\dojo\dojo.js:116:6
  at req.signal @ ..\dojo\dojo.js:391:4
  at Timeout.<anonymous> @ ..\dojo\dojo.js:1687:6
  at listOnTimeout @ internal\timers.js:549:17
  at processTimers @ internal\timers.js:492:7
TOTAL: tested 0 platforms, 0 passed, 0 failed; fatal error occurred
```
</details>

## Code coverage

> Tip: Intern's browser runner (`dgrid/test/intern/runTests.html`) does not generate code coverage

When tests are run with `npx intern` then code coverage information will be generated, regardless of whether the tests
are run with a local or remote (BrowserStack) WebDriver server. A summary of the coverage info is displayed in the
console after the test run. Detailed coverage info is written to the `dgrid/coverage` folder and can be viewed in a web
browser by loading `dgrid/coverage/index.html`.

## Addendum: running Selenium and WebDriver servers

### Selenium

* Java 8 or higher is required, and must be in your path ([OpenJDK](https://adoptopenjdk.net/))
* Download [Selenium server](https://www.selenium.dev/downloads/) (e.g. `selenium-server-standalone-3.141.59.jar`)
* `> java -jar selenium-server-standalone-3.141.59.jar`

### Individual WebDriver servers

ChromeDriver is the easiest and most reliable WebDriver server, some of the others do not allow you to modify the base
URL (e.g. geckodriver) and so require updating `tunnelOptions` in the Intern configuration to specify the port and/or
base URL.

dgrid's Intern configuration includes configs for several browsers that can be used either with Selenium or individual
WebDriver servers. The config name should be passed to Intern's `config` parameter on the command line.

config name | browser | WebDriver server
-------------|---------|------------------
`chrome` | Google Chrome | [ChromeDriver](https://chromedriver.chromium.org/downloads)
`firefox` | Mozilla Firefox | [geckodriver](https://github.com/mozilla/geckodriver/releases)
`safari` | Safari | [Safari](https://developer.apple.com/documentation/webkit/testing_with_webdriver_in_safari)
`edge` | Microsoft Edge | [Microsoft WebDriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/)
`ie` | Internet Explorer | [InternetExplorerDriver](https://selenium-release.storage.googleapis.com/index.html) ([info](https://github.com/SeleniumHQ/selenium/wiki/InternetExplorerDriver))
