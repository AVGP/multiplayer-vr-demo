# multiplayer-vr-demo

## What's this?

A small demo where multiple people can experience WebVR together.
Oh, and fly around as horses.

## How is it structured?

```
.
├── client
│   ├── app.js
│   ├── game.html
│   ├── index.html
│   ├── js
│   │   ├── game-world.js
│   │   ├── main.js
│   │   ├── mtlloader.js
│   │   ├── networking.js
│   │   ├── objloader.js
│   │   ├── objmtlloader.js
│   │   ├── vr-controls.js
│   │   └── vr-effect.js
│   ├── models
│   │   ├── horse
│   ├── sky
│   └── webvr-polyfill.js
├── msg-types.js
├── package.json
├── README.md
└── server.js
```

* The web and game server is in `server.js`, which is both an Express.js server and a websocket server.
* `client` holds both the game and the instruction page plus assets.
* `client/app.js` is the output from `browserify` of `client/js/main.js`.
* `client/webvr-polyfill.js` is a copy of [this file](https://github.com/borismus/webvr-polyfill/blob/3f477966abd594f37914c925d165c8fc8b2f05da/build/webvr-polyfill.js).
* `msg-types.js` is used by both server and client and defines the network message types.

## Setup

```
git clone https://github.com/avgp/multiplayer-vr-demo.git
cd multiplayer-vr-demo
npm install
npm run dev & node server.js
```

And then go to [http://localhost:3000](http://localhost:3000) - enjoy :o)

## Why did you do this?

Why *wouldn't* I do this? I mean, c'mon: Virtual Reality. With multiple people. In your browser. Woot!

## License

Copyright (c) 2015 Martin Naumann

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
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
