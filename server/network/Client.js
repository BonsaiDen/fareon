// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../../shared/lib/Class').Class,
    util = require('../../shared/util');


// WebSocket Client -----------------------------------------------------------
// ----------------------------------------------------------------------------
var Client = Class(function(server, socket, version, maxFrameSize, delay) {

    // References
    this._server = server;
    this._socket = socket;
    this._protocol = new WebSocketProtocol(
        this, server, socket, maxFrameSize, delay
    );

    // Public properties
    this.id = socket.remoteAddress + ':' + socket.remotePort;
    this.address = socket.remoteAddress;
    this.port = socket.remotePort;
    this.version = version;
    this.delay = delay || 0;

}, {

    // Public -----------------------------------------------------------------
    send: function(message) {
        if (this._protocol) {
            this._protocol.write(message);
        }
    },

    close: function(reason) {

        if (!this._protocol) {
            return false;

        } else if (!this._protocol.isConnected) {
            return false;

        } else {
            return this._protocol.close(false, reason);
        }

    },

    reset: function() {
        this._protocol = null;
        this._server = null;
        this.id = null;
    },

    // Logging ----------------------------------------------------------------
    log: function() {
        util.log(this.toString(), arguments);
    },

    toString: function() {
        var delay = this.delay ? ' (+' + this.delay + 'ms)' : '';
        return '[Client ' + this.id + ' Version ' + this.version + delay +']';
    }

});


// WebSocketProtocol (13) Implementation --------------------------------------
// ----------------------------------------------------------------------------
function WebSocketProtocol(client, server, socket, maxFrameSize, delay) {

    this.client = client;
    this.server = server;
    this.socket = socket;
    this.maxFrameSize = maxFrameSize;
    this.isConnected = true;

    this.buffer = new Buffer(0);
    this.bufferOffset = 0;

    this.mode = 0;
    this.op = 0;
    this.masked = false;
    this.maskOffset = 0;
    this.frameLength = 0;
    this.closeCode = 1000; // Normal closure

    var that = this;
    socket.on('data', function(data) {
        that.read(data);
    });

    socket.on('error', function(err) {
        that.close(err.message);
    });

    socket.on('end', function() {
        that.close(true);
    });


}

WebSocketProtocol.prototype = {

    read: function(data) {

        if (!this.isConnected) {
            return;

        } else if (data.length > this._maxFrameSize) {
            this.closeCode = 1009; // Message too big
            return this.close();
        }

        // Create a temporary buffer for reading
        var tmp = new Buffer(this.buffer.length + data.length);
        this.buffer.copy(tmp);
        data.copy(tmp, this.buffer.length);

        // Re-assign buffer
        this.buffer = tmp;

        var length = this.buffer.length;
        while(length > 0) {

            // Parse the available data for a message frame
            var result = this.parse(length);

            if (result === false || !this.isConnected) {
                break;

            // If we read a message, re-size the buffer and reset the offset
            } else if (result === true) {

                length = this.buffer.length - this.bufferOffset;
                tmp = new Buffer(length);
                this.buffer.copy(tmp, 0, this.bufferOffset);
                this.buffer = tmp;
                this.bufferOffset = 0;
            }

        }

    },

    parse: function(length) {

        var bytes = length - this.bufferOffset,
            buffer = this.buffer;

        var b;
        if (this.mode === 0 && bytes >= 1) {

            b = buffer[this.bufferOffset++];
            this.op = b & 15;
            b &= 240;

            // Reserved frame check
            if ((b & 2) === 2 || (b & 4) === 4 || (b & 8) === 8) {
                this.mode = -1;

            // Closing frame
            } else if (this.op === 8) {
                this.mode = -1;

            // Ping frame
            } else if (this.op === 9) {
                this.mode = 1;

            // Pong frame
            } else if (this.op === 10) {
                this.mode = 1;

            // Unused op codes
            } else if (this.op !== 1 && this.op !== 2 && this.op !== 9) {
                this.mode = -1;

            } else {
                this.mode = 1;
            }

        } else if (this.mode === 1 && bytes >= 1) {

            b = buffer[this.bufferOffset++];

            // Clients ALWAYS MASK, although they don't care to tell you
            this.masked = this.op !== 10 ? ((b & 1) === 1 || true) : false;
            this.frameLength = b & 127;

            if (this.frameLength <= 125) {
                this.mode = this.masked ? 4 : 5;

            } else if (this.frameLength === 126) {
                this.frameLength = 0;
                this.mode = 2;

            } else if (this.frameLength === 127) {
                this.frameLength = 0;
                this.mode = 3;

            } else {
                this.closeCode = 1002; // Protocol error
                this.mode = -1;
            }

        // Read 16 bit length
        } else if (this.mode === 2 && bytes >= 2) {

            this.frameLength = buffer[this.bufferOffset + 1]
                       + (buffer[this.bufferOffset] << 8);

            this.mode = this.masked ? 4 : 5;

            this.bufferOffset += 2;

        // Read 64 bit length
        } else if (this.mode === 3 && bytes >= 8) {

            var hi = (buffer[this.bufferOffset + 0] << 24)
                   + (buffer[this.bufferOffset + 1] << 16)
                   + (buffer[this.bufferOffset + 2] << 8)
                   +  buffer[this.bufferOffset + 3],

                low = (buffer[this.bufferOffset + 4] << 24)
                    + (buffer[this.bufferOffset + 5] << 16)
                    + (buffer[this.bufferOffset + 6] << 8)
                    +  buffer[this.bufferOffset + 7];

            this.frameLength = (hi * 4294967296) + low;
            this.mode = this.masked ? 4 : 5;

            this.bufferOffset += 8;

        // Read mask
        } else if (this.mode === 4 && bytes >= 4) {
            this.maskOffset = this.bufferOffset;
            this.mode = 5;

            this.bufferOffset += 4;

        // Read frame data
        } else if (this.mode === 5 && bytes >= this.frameLength)  {

            var message,
                isBinary = this.op === 2;

            if (this.frameLength > 0) {

                if (this.masked) {
                    var i = 0;
                    while(i < this.frameLength) {
                        buffer[this.bufferOffset + i]
                                        ^= buffer[this.maskOffset + (i % 4)];

                        i++;
                    }
                }

                this.server.bytesReceived += this.frameLength;
                message = buffer.toString(isBinary ? 'binary' : 'utf8',
                                          this.bufferOffset,
                                          this.bufferOffset + this.frameLength);

            } else {
                message = '';
            }

            this.mode = 0;

            this.bufferOffset += this.frameLength;
            this.server.bytesReceived += this.bufferOffset;

            // Ping
            if (this.op === 9) {
                this.write(message, isBinary);

            // Message
            } else if (this.op !== 10) {

                // In case something's wrong with the message, close the connection
                if (!this.server.onClientMessage(this.client, message, isBinary)) {
                    this.closeCode = 1003; // Unsupported data
                    this.close();
                }

            }

            return true;

        } else {
            return false;
        }

        if (this.mode === -1) {
            this.close(true);
            return false;
        }

    },

    write: function(data, binary, isClose) {

        if (!this.isConnected) {
            return false;

        } else if (!this.socket.writable) {
            return this.close(true);
        }

        var enc = binary ? 'binary' : 'utf8',
            length = Buffer.byteLength(data, enc) + (isClose ? 2 : 0),
            buffer,
            bytes = 2;

        // 64 Bit
        if (length > 0xffff) {

            var low = length | 0,
                hi = (length - low) / 4294967296;

            buffer = new Buffer(10 + length);
            buffer[1] = 127;

            buffer[2] = (hi >> 24) & 0xff;
            buffer[3] = (hi >> 16) & 0xff;
            buffer[4] = (hi >> 8) & 0xff;
            buffer[5] = hi & 0xff;

            buffer[6] = (low >> 24) & 0xff;
            buffer[7] = (low >> 16) & 0xff;
            buffer[8] = (low >> 8) & 0xff;
            buffer[9] = low & 0xff;

            bytes += 8;

        // 16 Bit
        } else if (length > 125) {
            buffer = new Buffer(4 + length);
            buffer[1] = 126;

            buffer[2] = (length >> 8) & 0xff;
            buffer[3] = length & 0xff;

            bytes += 2;

        // Normal length
        } else {
            buffer = new Buffer(2 + length);
            buffer[1] = length;
        }

        // Set op and fin
        buffer[0] = 128 + (isClose ? 8 : (binary ? 2 : 1));
        buffer[1] &= ~128; // Clear masking bit

        // Handle closing codes
        if (isClose) {
            var code = String.fromCharCode((this.closeCode >> 8) & 0xff)
                     + String.fromCharCode(this.closeCode & 0xff);

            buffer.write(code, bytes, 'binary');
            bytes += 2;
        }

        buffer.write(data, bytes, enc);
        this.socket.write(buffer);
        this.server.bytesSend += bytes + length;

    },

    close: function(closedByRemote, reason) {

        if (this.isConnected) {
            this.isConnected = false;

            this.buffer = null;
            this.bufferOffset = null;
            this.parser = null;

            this.write(reason || '', false, true);
            this.closeCode = null;

            this.socket.end();
            this.socket.destroy();

            this.server.onClientClose(this.client, closedByRemote || false);
            this.client.reset();

            this.server = null;
            this.socket = null;

            return true;

        } else {
            return false;
        }

    }

};


// Exports --------------------------------------------------------------------
module.exports = Client;

