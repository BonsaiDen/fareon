// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class,
    bison = require('bisonjs');


// Clientside Network Interface -----------------------------------------------
// ----------------------------------------------------------------------------
var Network = Class(function(connection, message, close) {

    this._events = {};

    this._socket = null;
    this._connectionCallback = connection;
    this._messageCallback = message;
    this._closeCallback = close;

    this._isConnected = false;
    this._wasConnected = false;
    this._closedByRemote = true;

    this._port = null;
    this._hostname = null;

    this._encoder = bison.encode;
    this._decoder = bison.decode;

}, {

    // Public -----------------------------------------------------------------
    connect: function(port, hostname, secure) {

        if (this._isConnected) {
            return false;
        }

        var Ws = typeof window.WebSocket !== 'undefined' ? window.WebSocket : window.MozWebSocket;
        try {
            this._socket = new Ws('ws' + (secure ? 's' : '') + '://'
                                    + hostname + (port !== undefined ? ':'
                                    + port : ''));

        } catch(e) {
            return e;
        }

        var that = this;
        this._socket.onopen = function() {
            that._isConnected = true;
            that._closedByRemote = true;
            that._connectionCallback();
        };

        this._socket.onmessage = function(msg) {
            that._messageCallback(that._decoder(msg.data));
        };

        this._socket.onclose = function(msg) {
            that._wasConnected = that._isConnected;
            that._isConnected = false;
            that._closeCallback(that._closedByRemote, msg.reason, msg.code);
        };

        this._port = port || 80;
        this._hostname = hostname;

        return true;

    },

    send: function(message) {

        if (!this.isConnected()) {
            return false;
        }

        this._socket.send(this._encoder(message));
        return true;

    },

    close: function() {

        if (!this.isConnected()) {
            return false;
        }

        this._closedByRemote = false;
        this._socket.close();
        return true;

    },


    // Getter -----------------------------------------------------------------
    isConnected: function() {
        return this._isConnected;
    },

    wasConnected: function() {
        return this._wasConnected;
    },


    // Logging ----------------------------------------------------------------
    toString: function() {
        return '[Network ' + this._hostname + ':' + this._port + ']';
    }

});


// Exports --------------------------------------------------------------------
module.exports = Network;

