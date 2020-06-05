
### Running chromedriver

```bash
chromedriver --port=4444 --url-base=wd/hub
```

## Debugging

```bash
npx intern leaveRemoteOpen
```

The `pretty` reporter erases errors that are output to the console. Delete the value in `intern.json` or change
it to `runner` while debugging.

### Loader errors

Loader errors may produce confusing output that does not facilitate debugging. If you encounter a loader error
carefully inspect all your imports and ensure that they are correct.

<details>
	<summary>Console output resulting from a loader error:</summary>

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
