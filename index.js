'use strict';

class IPFSConnection
{
    constructor(url, ipfsClient = null) {
        this.url = url

        if (ipfsClient != null) {
            this.ipfs = ipfsClient(this.url)
        } else {
            this.url = undefined
        }

        // Why this ID? Why not the IPFS id?
        // Well, you "could" be using a public node. You could be using your own node.
        // You could be using some node that happens to be available.
        // We just don't know.
        // So we create our own unique random id. It's in the same spirit as a random Socket.IO connection string.
        // That's random every time you refresh. This one is too.
        this.id = Array(10+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, 10)
        this.callbacks = new Map();
    }

    async _testConnection() {
        let idData = null;
        let returnObj = {status: false, partial: false, message: ""}
        
        if (this.url == undefined) {
            return returnObj;
        }

        try {
            idData = await this.ipfs.id()
            if (idData?.id) {
                returnObj.status = true
            }
        } catch (error) {
            // Todo. Figure out if there is a partial IPFS connection.
            // So for example if there is one but CORS is being a pain in the ass again.
            console.log(error)
            return returnObj;
        }

        return returnObj;
    }

    publish(channel, data) {
        this.ipfs.pubsub.publish(channel, JSON.stringify(data));
        
        if (data?.selfEmit) {
            this.callbacks[channel](JSON.stringify(data.data))
        }
    }

    subscribe(channel, callback) {
        this.callbacks[channel] = callback
        this.ipfs.pubsub.subscribe(channel, (msg) => {
            let enc = new TextDecoder("utf-8");
            let decodedData = JSON.parse(enc.decode(msg.data));

            // If you do a publish and subscribe on the same channel in quick succession then it often doesn't arrive here.
            // Even though it does in the pubsub when you monitor it with ipfs pubsub sub <channel>. So just kill those messages 
            // that are for this browser session. The publish part resolves it by looking at selfEmit and faking it.
            if (decodedData?.id == this.id) {
                return;
            }
            this.callbacks[channel](JSON.stringify(decodedData.data))
        });
    }
}

class OpenPubSubNetwork extends EventTarget
{
    constructor(properties) {
        super()
        this.urls = [
            // Note: these are TEMP servers! More server worldwide will later be added via <country>.openpubsub.network.
            // These *.sc2.nl servers will disappear in the near future!
            "opn_nl2.sc2.nl",
            "ipfs-websocket-api.sc2.nl"
        ]

        this.socket = null
        this.ipfsUrl = properties?.ipfsUrl
        this.ipfs = new IPFSConnection(this.ipfsUrl, properties?.ipfs)
        this.useIpfs = false
        this.io = properties.io
        this.atob = properties.atob
        this.btoa = properties.btoa
    }

    async _testConnection(url) {
        return new Promise((resolve, reject) => {
            let socket = this.io('wss://' + url, {
                transports: ['websocket'],
                reconnection: false
            });

            // Will be set to true by the first promise that resolves.
            socket.isWinning = false;

            socket.on('info', (data) => {
                let atob = this.atob
                console.log('Info data:')
                console.log(JSON.parse(atob(data)))
        
                let response = JSON.parse(atob(data))
        
                if (response.status == "CONN_OK") {
                    resolve(socket)
                } else {
                    socket.disconnect();
                    reject(response)
                }
            });
        });
    }

    async connect() {
        // First test if we have an IPFS connection.
        let ipfsStatus = await this.ipfs._testConnection()
        if (ipfsStatus.status == true) {
            this.useIpfs = true
            this.dispatchEvent(new Event('connected'));
            return;
        } else if (ipfsStatus.partial == true) {

        }

        let candidates = this.urls.map(url => this._testConnection(url))
        Promise.any(candidates).then((value) => {
            this.socket = value
            this.socket.io.reconnection(true);
            this.socket.isWinning = true;
            console.log(`Connected to: ${this.socket.io.engine.hostname}`)
        })
        
        await Promise.allSettled(candidates).then((results) => results.forEach((result) => {
            if (result.status == "fulfilled") {
                if (result.value.isWinning == false) {
                    result.value.disconnect()
                    console.log(`Disconnected from ${result.value.io.engine.hostname} because we already have a good connection to ${this.socket.io.engine.hostname}.`)
                }
            }
        }));

        if (this.socket?.isWinning) {
            this.dispatchEvent(new Event('connected'));
        }
    }
    
    // Just a small wrapper to give a "node.js familliar look". And "on" is quicker to write then "addEventListener".
    on(event, callback) {
        this.addEventListener(event, callback)
    }

    publish(channel, data, selfEmit = false) {
        if (this.useIpfs) {
            this.ipfs.publish(channel, {id: this.ipfs.id, data: data, selfEmit: selfEmit});
        } else {
            this.socket.emit('publish', { channel: channel, data: data, selfEmit: selfEmit })
        }
    }

    subscribe(channel, callback) {
        if (this.useIpfs) {
            this.ipfs.subscribe(channel, callback);
        } else {
            this.socket.emit('subscribe', channel)
            this.socket.on(channel, (data) => {
                let atob = this.atob
                callback(atob(data))
            });
        }
    }
}

export { OpenPubSubNetwork };