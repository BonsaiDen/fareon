// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var http = require('http'),
    crypto = require('crypto'),
    Class = require('../../shared/lib/Class').Class,
    Client = require('./Client');


// WebSocket Server -----------------------------------------------------------
// ----------------------------------------------------------------------------
var Server = Class(function(maxFrameSize, delay, connectCallback, messageCallback, closeCallback) {

    this._server = null;
    this._httpServer = false;
    this._upgradeHandler = null;
    this._maxFrameSize = maxFrameSize || 1024;

    this._clients = null;
    this._delay = delay || 0;

    this._connectCallback = connectCallback;
    this._messageCallback = messageCallback;
    this._closeCallback = closeCallback;

    this.bytesSend = 0;
    this.bytesReceived = 0;

}, {

    // Public -----------------------------------------------------------------
    listen: function(port, hostname) {

        this._clients = {};

        if (typeof port === 'number') {
            this._httpServer = true;
            this._server = new http.Server();
            this._server.listen(port, hostname);

        } else {
            this._httpServer = false;
            this._server = port;
        }

        this._server.on('upgrade', this._upgradeRequest.bind(this));

    },

    close: function(reason) {

        // Stop HTTP server / listener
        this.unbind('connection', this._connectCallback, this);
        this._server.removeListener('upgrade', this._upgradeHandler);

        if (this._server && this._httpServer) {
            this._server.close();
            this._httpServer = false;
        }

        // Remove all pending remotes
        for(var i in this._clients) {
            if (this._clients.hasOwnProperty(i)) {
                this._clients[i].close(reason);
            }
        }

        this._server = null;
        this._clients = null;

        return true;

    },

    onClientMessage: function(client, message, isBinary) {
        this._messageCallback(client, message, isBinary);
        return true;
    },

    onClientClose: function(client, reason) {
        delete this._clients[client.id];
        this._closeCallback(client, reason);
    },


    // Internals --------------------------------------------------------------
    _upgradeRequest: function(req, socket, headers) {

        if (!validateUpgrade(req)) {
            socket.end();
            socket.destroy();
            return false;
        }

        var handshake = getWebSocketHandshake(req, headers);
        if (handshake.version !== -1) {

            var data = 'HTTP/1.1 101 WebSocket Protocol Handshake\r\n'
                     + 'Upgrade: WebSocket\r\n'
                     + 'Connection: Upgrade\r\n';

            for(var i in handshake.headers) {
                if (handshake.headers.hasOwnProperty(i)) {
                    data += i + ': ' + handshake.headers[i] + '\r\n';
                }
            }

            data += '\r\n' + handshake.body;
            socket.write(data, 'ascii');

            socket.setTimeout(0);
            socket.setNoDelay(true);
            socket.setKeepAlive(true, 0);
            socket.removeAllListeners('timeout');

            var client = new Client(this, socket, handshake.version,
                                    this._maxFrameSize, this._delay);

            this._clients[client.id] = client;
            this._connectCallback(client);

            return true;


        } else {
            socket.end();
            socket.destroy();
            return false;
        }

    },

});

// Helpers --------------------------------------------------------------------
function validateUpgrade(req) {
    var headers = req.headers;
    return req.method === 'GET'
            && headers.hasOwnProperty('upgrade')
            && headers.hasOwnProperty('connection')
            && headers.upgrade.toLowerCase() === 'websocket'
            && headers.connection.toLowerCase().indexOf('upgrade') !== -1;
}

function getWebSocketHeaders(httpHeaders) {

    var headers = {
        host: httpHeaders.host,
        origin: httpHeaders.origin,
        version: +httpHeaders.version || -1
    };

    for(var i in httpHeaders) {
        if (i.substring(0, 14) === 'sec-websocket-') {
            headers[i.substring(14)] = httpHeaders[i];
        }
    }

    return headers;

}

function pack32(value) {
    return String.fromCharCode(value >> 24 & 0xFF)
           + String.fromCharCode(value >> 16 & 0xFF)
           + String.fromCharCode(value >> 8 & 0xFF)
           + String.fromCharCode(value & 0xFF);
}

function getWebSocketHandshake(req, head) {

    var handshake = {
        version: -1,
        headers: null,
        body: ''
    };

    var headers = getWebSocketHeaders(req.headers);
    if (headers.version !== -1 && 'origin' in headers) {

        var sha1 = crypto.createHash('sha1');
        sha1.update(headers.key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');

        handshake.version = 13;
        handshake.headers = {
            'Sec-WebSocket-Version': headers.version,
            'Sec-WebSocket-Origin': headers.origin,
            'Sec-WebSocket-Accept': sha1.digest('base64')
        };

    } else  {

        var md5 = crypto.createHash('md5');
        if ('key1' in headers && 'key2' in headers) {

            var k = headers.key1,
                l = headers.key2,
                a = parseInt(k.replace(/[^\d]/g, ''), 10),
                b = parseInt(l.replace(/[^\d]/g, ''), 10),
                u = k.replace(/[^\ ]/g, '').length,
                o = l.replace(/[^\ ]/g, '').length;

            if (!(u === 0 || o === 0 || a % u !== 0 || b % o !== 0)) {

                md5.update(pack32(parseInt(a / u, 10)));
                md5.update(pack32(parseInt(b / o, 10)));
                md5.update(head.toString('binary'));

                handshake.version = 6;
                handshake.body = md5.digest('binary');
                handshake.headers = {
                    'Sec-WebSocket-Origin': headers.origin,
                    'Sec-WebSocket-Location': 'ws://' + headers.host + '/'
                };

            }

        } else {
            handshake.version = 6;
            handshake.body = md5.digest('binary');
            handshake.headers = {
                'WebSocket-Origin': headers.origin,
                'WebSocket-Location': 'ws://' + headers.host + '/'
            };
        }

    }

    return handshake;

}


// Exports --------------------------------------------------------------------
module.exports = Server;

