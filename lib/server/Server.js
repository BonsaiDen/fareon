// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var lithium = require('lithium'),
    bison = require('bisonjs'),
    Class = require('../shared/lib/Class').Class,
    Level = require('./Level'),
    Player = require('./Player'),
    Action = require('../shared/Action'),
    util = require('../shared/util');


// Shooter Server -------------------------------------------------------------
var Server = Class(function(config, playerClass, levelClass, delay) {

    config = config || {};

    // Configuration
    this._config = {
        tickRate: config.tickRate || 30,
        firingTickDelay: config.firingTickDelay || 10,
        maxPlayers: config.maxPlayers || 8,
        maxPlayerSpeed: config.maxPlayerSpeed || 10,
        maxStateBufferSize: config.maxStateBufferSize || 40
    };

    // Update Logic
    this._tickCount = 0;
    this._fullTickCount = 0;
    this._nextTickTime = 0;
    this._loopTimeout = null;
    this._fastLoopTimeout = null;

    // Classes
    this._playerClass = playerClass || Player;
    this._levelClass = levelClass || Level;

    // Players
    this._playerList = [];
    this._playerMap = {};

    // Level
    this._level = null;

    // Network
    this._hostname = null;
    this._port = null;
    this._remotes = [];
    this._isListening = false;
    this._socket = new lithium.Server(
        null, bison.encode, bison.decode, 512, delay
    );

    this._socket.on('connection', this._onConnection.bind(this));

}, {

    // Public -----------------------------------------------------------------
    listen: function(port, hostname) {

        if (this._isListening) {
            return false;

        } else {
            this._isListening = true;
            this._port = port;
            this._hostname = hostname || '0.0.0.0';
            this._socket.listen(this._port, this._hostname);
            this._loop();
            this.log('Listening');
        }

    },

    setLevel: function(data) {
        this._level = new this._levelClass(this);
        this._level.restore(data);
    },

    close: function() {

        if (this._isListening) {

            this.log('Closing...');
            this._socket.close();
            this._isListening = false;
            this.log('Closed');

            return true;

        } else {
            return false;
        }

    },

    // Getter -----------------------------------------------------------------
    getTick: function() {
        return this._tickCount;
    },

    getFullTick: function() {
        return this._fullTickCount;
    },

    getLevel: function() {
        return this._level;
    },

    getConfig: function() {
        return this._config;
    },

    getPlayers: function() {
        return this._playerList;
    },

    getPlayerById: function(id) {
        return this._playerMap[id] || null;
    },


    // Players ----------------------------------------------------------------
    _addPlayer: function(remote, name) {

        this.log('Creating Player...');

        // Create player and add it to all lists
        var player = new this._playerClass(this, remote, name);
        remote.player = player;
        this._playerList.push(player);
        this._playerMap[player.getId()] = player;

        // Send the new player to all connectes remotes
        this._remotes.forEach(function(r) {
            r.send([
                Action.SERVER_PLAYER_JOIN,
                player.getInfo(r === remote)
            ]);
        });

        this.log('Player joined ', player);

    },

    _rewindPlayers: function(tick, excludedPlayer) {

        for(var i = 0, l = this._playerList.length; i < l; i++) {

            var player = this._playerList[i];
            if (player !== excludedPlayer) {
                player.rewind(tick);
            }

        }

    },

    _forwardPlayers: function(excludedPlayer) {

        for(var i = 0, l = this._playerList.length; i < l; i++) {

            var player = this._playerList[i];
            if (player !== excludedPlayer) {
                player.forward();
            }

        }

    },

    _removePlayer: function(id) {

        this.log('Destroying Player...');

        // Remove player from all lists
        var player = this._playerMap[id];
        delete this._playerMap[id];
        this._playerList.splice(this._playerList.indexOf(player), 1);

        // Send remove event to all remotes
        this._remotes.forEach(function(remote) {
            remote.send([Action.SERVER_PLAYER_LEAVE, id]);
        });

        this.log('Player left ', player);

        player.destroy();

    },


    // Networking -------------------------------------------------------------
    _onConnection: function(remote) {

        // Setup Remote
        remote.accept();
        remote.on('message', this._onRemoteMessage.bind(this, remote));
        remote.on('close', this._onRemoteClose.bind(this, remote));
        this._remotes.push(remote);

        // Setup Game for Client
        remote.send([
            Action.SERVER_GAME_SETUP,
            [
                this._tickCount,
                this._config,
                this._level.serialize()
            ]
        ]);

        // Send existing players to remote
        this._playerList.forEach(function(player) {
            remote.send([
                Action.SERVER_PLAYER_JOIN,
                player.getInfo(false)
            ]);
        });

        this.log('Client connected ', remote);

    },

    _onRemoteMessage: function(remote, msg) {

        if (util.isValidMessage(msg)) {

            var type = msg[0],
                data = msg[1];

            // Player
            if (remote.player) {

                // State Updates
                if (type === Action.CLIENT_STATE && util.isValidClientState(data)) {
                    remote.player.applyState(data, this._config);

                // Events
                } else if (type === Action.CLIENT_EVENT && util.isValidEvent(data)) {

                    // Validate event tick send by client
                    if (remote.player.getClientTick() === data[0]) {

                        // Rewind all players to the specified client tick
                        this._rewindPlayers(data[0], remote.player);

                        // Apply event
                        remote.player.applyEvent(
                            this._fullTickCount,
                            data[0], data[1], data[2],
                            this._config
                        );

                        // Forward players back to their actual, current state
                        this._forwardPlayers(remote.player);

                    } else {
                        this.log('Invalid event tick received, dropping event ', data);
                    }

                } else {
                    this.log('Invalid message received, dropping ', remote);
                    remote.close();
                }

            // Remote
            } else if (type === Action.CLIENT_JOIN) {

                if (this._playerList.length < this._config.maxPlayers) {

                    if (util.isValidPlayerName(data)) {
                        this._addPlayer(remote, data);

                    } else {
                        this.log('Invalid message received, dropping ', remote);
                        remote.close();
                    }

                } else {
                    this.log('Failed to join game, max player amount reached ', remote);
                }

            } else {
                this.log('Invalid message received, dropping ', remote);
                remote.close();
            }

        } else {
            this.log('Invalid message received, dropping ', remote);
            remote.close();
        }

    },

    _onRemoteClose: function(remote) {

        if (remote.player) {
            this._remotes.splice(this._remotes.indexOf(remote), 1);
            this._removePlayer(remote.player.getId());
            remote.player = null;
        }

        this.log('Client dis-connected ', remote);

    },


    // Update Loop ------------------------------------------------------------
    _loop: function() {

        var perTick = (1000 / this._config.tickRate);

        // Initial setup
        if (this._nextTickTime === 0) {
            this._nextTickTime = Date.now() + perTick;
            this._boundLoop = this._loop.bind(this);
        }

        // Check how much difference there is left
        var diff = Math.max(this._nextTickTime - Date.now(), 0);

        // If there's more than 3ms left we use the default setTimeout
        if (diff > 3 || diff === 0) {

            this._loopTimeout = setTimeout(this._boundLoop);

            // If we hit the target time, we run the update loop
            if (diff === 0) {

                this._nextTickTime = Date.now() + perTick;
                this._lastTickTime = Date.now();

                if (this._remotes.length) {
                    this._tick();

                } else {
                    this._tickCount = 0;
                    this._fullTickCount = 0;
                }

            }

        // Otherwise we do high precision timing via setImmediate
        } else {
            this._fastLoopTimeout = setImmediate(this._boundLoop);
        }

    },

    _tick: function() {

        var previousTick = this._tickCount;

        this._tickCount = (this._tickCount + 1) % 256;
        this._fullTickCount++;

        // Tick all players on the server and collect their public states
        var states = [];
        for(var i = 0, l = this._playerList.length; i < l; i++) {

            var player = this._playerList[i];
            states.push([
                player.getId(),
                player.tick(this._tickCount, this._config.maxStateBufferSize),
                player.getEvents()
            ]);

        }

        // Send out state updates to all remotes
        this._remotes.forEach(function(remote) {

            // TODO to support larger maps and players we need to split the level
            // up into quads and only send state updates for the current / neighboring
            // quads to each respective remote

            // Very important to send the PREVIOUS tick here
            // since we're confirming that one to the remotes!
            if (remote.player) {

                var id = remote.player.getId();
                remote.send([
                    Action.SERVER_GAME_TICK, [
                        remote.player.getClientTick(),

                        // Switch out the public state for the private one
                        states.map(function(s) {
                            if (s[0] === id) {
                                return [
                                    s[0],
                                    remote.player.getState(true),
                                    s[2]
                                ];

                            } else {
                                return s;
                            }
                        })
                    ]
                ]);

            } else {
                remote.send([Action.SERVER_GAME_TICK, [previousTick, states]]);
            }

        });

    },

    // Logging ----------------------------------------------------------------
    log: function() {
        util.log(this._logger, this.toString(), arguments);
    },

    toString: function() {
        return '[ Server ' + this._hostname + ':' + this._port + ' ]';
    }

});


// Exports --------------------------------------------------------------------
module.exports = Server;

