// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var bison = require('bisonjs'),
    Class = require('../shared/lib/Class').Class,
    Message = require('../shared/Message'),
    util = require('../shared/util');


// Player Base Class ----------------------------------------------------------
// ----------------------------------------------------------------------------
var Player = Class(function(server, client, name) {

    // References
    this._server = server;
    this._client = client;
    this._entity = null;

    // State
    this._id = null;
    this._name = name;
    this._isSpectator = false;

    // Ping (calculated based on state tick difference)
    this._ping = -1;

    // Events to be send to clients with the next tick
    this._eventQueue = [];

}, {

    // Public -----------------------------------------------------------------
    send: function(msg) {
        this._client.send(msg);
    },

    sendEvent: function(event) {
        this._eventQueue.push(event);
    },

    tick: function(tick) {
    },

    ping: function(tick, tickRate) {

        // Ping once every second
        if (tick % tickRate === 0) {
            this.send(bison.encode([Message.SERVER_PING, Date.now() % 10000]));
        }

    },

    pong: function(time) {
        var dt = ((((Date.now() % 10000) + 10000) - time) % 10000) * 0.5;
        this._ping = Math.ceil(this._ping * 0.5 + dt * 0.5);
    },

    destroy: function() {

        this.setEntity(null);
        this._server = null;
        this._client = null;
        this._id = null;
        this._name = null;

    },


    // Setter -----------------------------------------------------------------
    setId: function(id) {
        this._id = id;
    },

    setSpectator: function(mode) {
        this._isSpectator = mode;
    },

    setEntity: function(entity) {

        // Reset ping value
        this._ping = -1;
        this._lastPingTime = Date.now();

        // If there was an old entity unset its player
        if (this._entity) {
            this._entity.setPlayer(null);
        }

        // Set the new references
        this._entity = entity;

        // If we have a new entity also set its player
        if (entity) {
            entity.setPlayer(this);
        }

    },


    // Getter -----------------------------------------------------------------
    getId: function() {
        return this._id;
    },

    getData: function(isPrivate) {
        return [];
    },

    getEntity: function() {
        return this._entity;
    },

    getEvents: function() {
        var events = this._eventQueue.slice();
        this._eventQueue.length = 0;
        return events;
    },

    getPing: function() {
        return this._ping;
    },

    isSpectator: function() {
        return this._isSpectator;
    },


    // Serialization ----------------------------------------------------------
    serialize: function(isPrivate) {
        return [this._id, this._name, isPrivate, this.getData(isPrivate)];
    },


    // Logging ----------------------------------------------------------------
    log: function() {
        util.log(this.toString(), arguments);
    },

    toString: function() {
        return '[ Player #' + this._id + ' "' + this._name
                + ' | ' + this._client.toString()
                + ' | Ping: ' + this.getPing() + 'ms ]';
    }

});


// Exports --------------------------------------------------------------------
module.exports = Player;

