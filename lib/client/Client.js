// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class,
    bison = require('bisonjs'),
    lithium = require('lithium/client/lithium').lithium,
    Class = require('../shared/lib/Class').Class,
    Level = require('./Level'),
    Player = require('./Player'),
    Action = require('../shared/Action');


// FPS Client Base Class ------------------------------------------------------
// ----------------------------------------------------------------------------
var Client = Class(function(playerClass, levelClass) {

    // Configuration
    this._config = {};

    // Players
    this._playerList = [];
    this._playerMap = {};

    // Level
    this._level = null;

    // Logic
    this._lastTick = 0;
    this._tickCount = 0;

    // Classes
    this._playerClass = playerClass || Player;
    this._levelClass = levelClass || Level;

    // Networking
    this._port = null;
    this._host = null;

    this._socket = new lithium.Client(null, bison.encode, bison.decode);
    this._socket.on('connection', this._onConnection.bind(this));
    this._socket.on('message', this._onMessage.bind(this));
    this._socket.on('close', this._onClose.bind(this));

}, {

    // Public -----------------------------------------------------------------
    connect: function(port, host) {
        this._port = port;
        this._host = host;
        this._socket.connect(port, host);
    },

    send: function(msg) {
        this._socket.send(msg);
    },

    tick: function(localTick, serverTick, states, config) {
        for(var i = 0, l = states.length; i < l; i++) {

            var state = states[i],
                id = state[0],
                events = state[2];

            this._playerMap[id].tick(localTick, serverTick, state[1], config);

            for(var e = 0, el = events.length; e < el; e++) {
                this._playerMap[id].applyEvent(localTick, serverTick, events[e], config);
            }

        }
    },

    close: function() {
        this.destroy();
    },

    destroy: function() {

        this._playerList.forEach(function(player) {
            player.destroy();
        });

        if (this._level) {
            this._level.destroy();
            this._level = null;
        }

        this._playerList.length = 0;
        this._playerMap = {};

    },


    // Getter -----------------------------------------------------------------
    getTime: function() {
        return this._tickCount * Math.floor(1000 / this.getTickRate());
    },

    getConfig: function() {
        return this._config;
    },

    getTickRate: function() {
        return this._config.tickRate;
    },

    getTick: function() {
        return this._tickCount % 256;
    },

    getLevel: function() {
        return this._level;
    },

    getPlayers: function() {
        return this._playerList;
    },

    getPlayerById: function(id) {
        return this._playerMap[id] || null;
    },


    // Network ----------------------------------------------------------------
    _onConnection: function() {
        this._socket.send([Action.CLIENT_JOIN, 'Player']);
    },

    _onMessage: function(msg) {

        var type = msg[0],
            data = msg[1];

        switch(type) {

            case Action.SERVER_GAME_SETUP:
                this._tickCount = data[0];
                this._config = data[1];
                this._level = new this._levelClass(this);
                this._level.restore(data[2]);
                break;

            case Action.SERVER_PLAYER_JOIN:
                this._addPlayer(data[0], data[1], data[2], data[3]);
                break;

            case Action.SERVER_PLAYER_LEAVE:
                this._removePlayer(data);
                break;

            case Action.SERVER_GAME_TICK:
                this._tickCount++;
                this.tick(this._tickCount, data[0], data[1], this._config);
                break;

            default:
                break;
        }

    },

    _onClose: function() {
        this.close();
    },


    // Players ----------------------------------------------------------------
    _addPlayer: function(id, isLocal, state, data) {

        var player = new this._playerClass(this, id, isLocal);
        player.applyState(state);
        player.applyData(data);

        this._playerList.push(player);
        this._playerMap[player.getId()] = player;

        return player;

    },

    _removePlayer: function(id) {

        var player = this._playerMap[id];

        delete this._playerMap[id];
        this._playerList.splice(this._playerList.indexOf(player), 1);

        player.destroy();

    }

});


// Exports --------------------------------------------------------------------
module.exports = Client;

