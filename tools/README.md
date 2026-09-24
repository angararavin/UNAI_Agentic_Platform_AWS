# Build tools

## build_dist.js — obfuscated distribution build
Strips all source comments and minifies the app (global names preserved so it still runs).
```
npm i -D terser javascript-obfuscator
node tools/build_dist.js unai-app dist/unai-app
# then: cd dist/unai-app && node server.js
```
Deterrent, not encryption. Strong protection = run the runtime server-side and expose only APIs.
