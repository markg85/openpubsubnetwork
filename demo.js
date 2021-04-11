import { io } from "socket.io-client";
import ipfsClient from "ipfs-http-client"
import { OpenPubSubNetwork } from "./index.js"
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