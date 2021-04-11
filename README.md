# OpenPubSubNetwork
This is an attempt at making the IPFS PubSub framework fully accessible in websites and IPFS nodes. Or for that matter, even in Libp2p nodes as that's where PubSub is actually implemented.

# How does this library work?
There are two ways how a user can connect to the IPFS PubSub network. One is obviously with access to a local IPFS node. This is the preferred way butisn't very straightforward. IPFS needs to be started with pubsub enabled and needs to have CORS allowed on * to make it work. That's not trivial though we will likelt get there one day.

Another way is via a proxy. The user connects to a site that exposes a websocket. That websocket is the intermediary between the user and an IPFS node. This is what OpenPubSubNetwork provides. A list of worldwide endpoints to connect to and get access to IPFS PubSub. Along with that an easy to use library to get you started.

# Heavily Work in progress!
While this project has a domain (openpubsub.network), it's not done yet. Right now there are 2 test nodes alive. They do work, but having them run along with a full IPFS node backing them is rather taxing for the vultr $5 instances they are on. The backend needs to be changed to do PubSub over just Libp2p, which should be a lot less resouce heavy. Once that's working I will spend the time and money to get about 6-10 nodes online across the globe at which point this project can be considered in beta.

Further more, the library currently is a really happy day one. Meaning that it can still easily crash. There is a lot more refinement work to be done. I do welcome patches.

# When NOT to use this?
If you run a local site and need some pubsub messages between local things. Don't waste this pubsub for that. There are other libraries more suited for that purpose and much faster (latency wise).

# When to use OpenPubSubNetwork?
When you need to communicate between n parties where they are not locally accessible. So for example, implementing a chat site on this is very much an intended purpose. Implementing website <> desktop communication is very much intended too.

# Browserify and other js builders
I intentially did **not** go that route. The code is now fairly minimal and works on both a browser and node.js. In my opinion (and experience) those builders add way to much cruft that explode the js filesize. I'm open to accepting patches for this if it's really needed.

# Node.js example
Install the following node.js packages:
`npm install socket.io-client ipfs-http-client openpubsubnetwork atob btoa`

And run the following code.

```js
import { io } from "socket.io-client";
import ipfsClient from "ipfs-http-client"
import { OpenPubSubNetwork } from "openpubsubnetwork"
import atob from "atob"
import btoa from "btoa"

(async function(){
    let opsn = new OpenPubSubNetwork({
        // Provide an IPFS api endpoint. It must be one where port 5001 is open and pubsub is enabled.
        // Note that you will get a fetch error if yhis url is invalid. That's OK! If that error pops up, it will try websockets next.
        ipfsUrl: "http://127.0.0.1:5001",

        // The IPFS client connection
        ipfs: ipfsClient,

        // The Socket.IO client connection
        io: io,

        // atob method (in browsers known as window.atob)
        atob: atob,

        // btoa method (in browsers known as window.btoa)
        btoa: btoa
      });

      opsn.connect();

      opsn.on("connected", () => {
        opsn.subscribe("openpubsubdemo", (data) => {
          console.log(JSON.parse(data))
        });
        opsn.publish("openpubsubdemo", {message: "Welcome to the 'Open PubSub Network! (delivered to you via the IPFS PubSub functionality)"}, true)
      });
})()
```

# Browser example
Get the latest version of:
* [Socket.io](https://github.com/socketio/socket.io/releases)
* [ipfs-http-client](https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client#in-a-web-browser)
* [openpubsubnetwork](https://github.com/markg85/openpubsubnetwork/blob/main/index.js)

You will have to do some renaming in the downloads. For example, the openpubsubnetwork file is index.js which i renamed to openpubsubnetwork.js in this example. Same for ipfs-http-client.

```js
  <script src="socket.io.min.js"></script>
  <script src="ipfs-http-client.min.js"></script>
  <script type="module">
    import { OpenPubSubNetwork } from './openpubsubnetwork.js'

    (async function(){
      let opsn = new OpenPubSubNetwork({
        ipfsUrl: "http://127.0.0.1:5001",
        ipfs: IpfsHttpClient,
        io: io,
        atob: window.atob,
        btoa: window.btoa
      });

      // let opsn = new OpenPubSubNetwork();
      opsn.connect();

      opsn.on("connected", () => {
        opsn.subscribe("openpubsubdemo", (data) => {
          console.log(JSON.parse(data))
        });
        opsn.publish("openpubsubdemo", {message: "Welcome to the 'Open PubSub Network! (delivered to you via the IPFS PubSub functionality)"}, true)
      });

    })()
  </script>
```

# Security/encryption
None. There just is none.
If you publish something on a channel, anyone listening on that channel can see what you published.
It's meant as a library to make IPFS PubSub possible in the browser, a pass-through hatch of sorts.

If you want to have it secure, you need to add your own layer of encryption on top of it.

# API description

## OpenPubSubNetwork conctrustor
The constructor take an object with a couple of settings:
```js
// Provide an IPFS api endpoint. It must be one where port 5001 is open and pubsub is enabled.
// Note that you will get a fetch error if yhis url is invalid. That's OK! If that error pops up, it will try websockets next.
ipfsUrl: "http://127.0.0.1:5001",

// The IPFS client connection
ipfs: ipfsClient,

// The Socket.IO client connection
io: io,

// atob method (in browsers known as window.atob)
atob: atob,

// btoa method (in browsers known as window.btoa)
btoa: btoa
```

You should set all of them!

## connect
Just call connect after the constructor. Don't await it! If you do, you likely missed the `connected` event thus your event handling won't be registered. You can also call connect last.

## Connection event
There is only one event, at the moment. `connection`. It tells you when OpenPubSubNetwork has made a connection to either IPFS or one of the websocket endpoints.

You must register your publish and subscribe handling in the handling of this connection event!

## publish
Publish takes 2 arguments:
* String: the channel to publish to
* JSON: The data to publish

## subscribe
Subscribe takes 3 arguments:
* String: the channel on which you want to listen for events.
* A callback that is called when an event for that channel is received. The callback only has one argument which is the data. This is plain data, you need to do extra decoding (like JSON.parse).
* The third argument is `selfEmit`. It default to `false`. Setting it to true means you will get events you have published. Setting it to false means everyone except you will get the event.