# dgrid automated testing with Intern

dgrid's test suite is written and configured to run with [Intern](https://theintern.io/). Unit tests can be run both
directly in a web browser and using WebDriver. Functional tests will only run with WebDriver.

## Running dgrid tests

### Full test suite with WebDriver & BrowserStack

Requirements:

* Node.js and npm installed locally
* dgrid dependencies installed locally (`npm install`)
* Active BrowserStack account and `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` environment variables set

```bash
> npx intern config=@browserstack
```

This will run Intern with the `"browserstack"` config from `intern.json`. Intern will run a local HTTP server to
serve dgrid test files to BrowserStack via Intern's DigDug proxy tunnel. The code in functional test suites will
run in the local Node.js environment. The remote control commands in the tests are sent to the remote browser via
Intern's WebDriver library, Leadfoot.

Refer to the documentation on the [Intern website](https://theintern.io/) if you want to configure Intern to run with a
local [Selenium](https://www.selenium.dev/) installation.

## Developing and debugging dgrid tests

> Tip: Use `grep` to run specific tests

The easiest way to debug tests is by running them from a local HTTP server in a local web browser. Opening
`dgrid/test/intern/runTests.html` will redirect you to Intern's test runner. By default this will run all of dgrid's
unit tests. You can click on any suite or test in the Intern Test Report to re-run specific tests. Doing so will add the
`grep` parameter to the URL's query string. You can specify your own value for `grep` to run only tests whose suite
name or test name match the value. Refer to the Intern documentation to see other Intern configuration values that
can be set in the query string.

### Functional tests

[Selenium](https://www.selenium.dev/) or individual WebDriver servers can be run locally.

> Tip: Chrome is the easiest and most reliable driver to run locally

* Download the appropriate [ChromeDriver](https://chromedriver.chromium.org/downloads) for the version of Chrome you have
* Launch ChromeDriver:
  * `> chromedriver`
  * Note: `chromedriver --help` will display the CLI options
* Run Intern with the `chrome` config:
  * `> npx intern config=@chrome`

### Individual WebDriver servers

dgrid's Intern configuration includes configs for several browsers that can be used either with Selenium or individual
WebDriver servers. The config name is passed to Intern's `config` parameter on the command line.

config name | browser | WebDriver server
-------------|---------|------------------
`chrome` | Google Chrome | [ChromeDriver](https://chromedriver.chromium.org/downloads)
`firefox` | Mozilla Firefox | [geckodriver](https://github.com/mozilla/geckodriver/releases)
`safari` | Safari | [Safari](https://developer.apple.com/documentation/webkit/testing_with_webdriver_in_safari)
`edge` | Microsoft Edge | [Microsoft WebDriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/)
`ie` | Internet Explorer | [InternetExplorerDriver](https://selenium-release.storage.googleapis.com/index.html) ([info](https://github.com/SeleniumHQ/selenium/wiki/InternetExplorerDriver))

### Leaving the test browser open

dgrid's Intern configuration will leave the test browser open only if one or more tests fail. You can change
`leaveRemoteOpen` on the command line:

```bash
> npx intern config=@chrome leaveRemoteOpen=true
```

The `pretty` reporter erases errors that are output to the console. You can use the `runner` reporter while debugging
failures:

```bash
> npx intern config=@chrome reporters=runner
```

### Loader errors

Loader errors, both from Dojo's AMD loader and from Node.js' `require` may produce confusing output that does not
facilitate debugging. If you encounter a loader error carefully inspect all your imports and ensure that they are
correct.

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

> Tip: Intern's browser runner does not generate code coverage

When tests are run with `npx intern` then code coverage
information will be generated, regardless of whether the tests are run with a local or remote (BrowserStack) WebDriver
server. A summary of the coverage info is displayed in the console after the test run. Detailed coverage info is
written to the `dgrid/coverage` folder and can be viewed in a web browser by loading `dgrid/coverage/index.html`.
