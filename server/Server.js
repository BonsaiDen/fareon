// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var //lithium = require('lithium'),
    bison = require('bisonjs'),
    Class = require('../shared/lib/Class').Class,
    Level = require('./Level'),
    Player = require('./Player'),
    Entity = require('./Entity'),
    NetworkServer = require('./network/Server'),
    Base = require('../shared/Base'),
    Message = require('../shared/Message'),
    util = require('../shared/util');


// Shooter Server -------------------------------------------------------------
var Server = Class(function(config, playerClass, levelClass, delay) {

    // Configuration
    config = util.mergeWithDefaults(config, {
        tickRate: config.tickRate || 30,
        maxPlayers: config.maxPlayers || 8,
        maxPlayerSpeed: config.maxPlayerSpeed || 10,
        maxStateBufferSize: config.maxStateBufferSize || 40,
        maxEntities: config.maxEntities || 255
    });

    Base(this, playerClass || Player, levelClass || Level, config);

    // Update Logic
    this._fullTickCount = 0;
    this._nextTickTime = 0;
    this._loopTimeout = null;
    this._fastLoopTimeout = null;

    // Entities
    this._entities.resize(this._config.maxEntities);

    // Players
    this._players.resize(this._config.maxPlayers);

    // Events
    this._eventQueue = [];

    // Network
    this._isListening = false;
    this._socket = new NetworkServer(
        512, delay,
        this._onConnection.bind(this),
        this._onMessage.bind(this),
        this._onClose.bind(this)
    );


}, Base, {

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

    sendEvent: function(event) {
        this._eventQueue.push(event);
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
    isClient: function() {
        return false;
    },

    isServer: function() {
        return true;
    },

    getFullTick: function() {
        return this._fullTickCount;
    },


    // Players ----------------------------------------------------------------
    addPlayer: function(player) {

        // Send existing data to new player
        this._sendSetup(player);
        this._sendPlayers(player);
        this._sendEntities(player);

        player.setId(this._players.add(player));

        // Send new player to existing players
        this.getPlayers().forEach(function(p) {
            p.send(bison.encode([
                Message.SERVER_PLAYER_JOIN,
                player.serialize(p === player)
            ]));
        });

        this.log('Player joined ', player);

    },

    removePlayer: function(player) {
        this._players.remove(player);
        this._send(bison.encode([Message.SERVER_PLAYER_LEAVE, player.getId()]));
        this.log('Player left ', player);
    },


    // Entities ---------------------------------------------------------------
    addEntity: function(entity) {

        entity.setId(this._entities.add(entity));

        this.getPlayers().forEach(function(player) {
            player.send(bison.encode([
                Message.SERVER_ENTITY_ADD,
                entity.serialize(player === entity.getPlayer())
            ]));
        });

        this.log('Entity added ', entity);

    },

    setEntityPlayer: function(entity, player) {
        this._send(bison.encode([
            Message.SERVER_ENTITY_SET_PLAYER,
            [entity.getId(), player ? player.getId() : 0]
        ]));
    },

    _rewindEntities: function(tick, excludedPlayer) {

        var entities = this.getEntities();
        for(var i = 0, l = entities.length; i < l; i++) {
            var entity = entities[i];
            if (entity !== excludedPlayer) {
                entity.rewind(tick);
            }
        }

    },

    _forwardEntities: function(excludedPlayer) {

        var entities = this.getEntities();
        for(var i = 0, l = entities.length; i < l; i++) {
            var entity = entities[i];
            if (entity !== excludedPlayer) {
                entity.forward();
            }
        }

    },

    removeEntity: function(entity) {

        this._entities.remove(entity);
        this._send(bison.encode([Message.SERVER_ENTITY_REMOVE, entity.getId()]));
        this.log('Entity removed ', entity);

    },


    // Updates ----------------------------------------------------------------
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

                if (this._players.length) {
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

        var previousTick = this._tickCount,
            players = this.getPlayers(),
            entities = this.getEntities(),
            events = [],
            event;

        // Serialize Game Events
        for(var i = 0, l = this._eventQueue.length; i < l; i++) {
            event = this._eventQueue[i];
            events.push([0, event.TypeId, event.serialize()]);
        }

        this._eventQueue.length = 0;

        // Update Tick
        this._tickCount = (this._tickCount + 1) % 256;
        this._fullTickCount++;

        // Tick all players on the server
        for(i = 0, l = players.length; i < l; i++) {

            players[i].tick(this._tickCount);

            // Serialize player events
            var playerEvents = players[i].getEvents();
            for(var e = 0, el = playerEvents.length; e < el; e++) {
                event = playerEvents[e];
                events.push([1, event.TypeId, event.serialize()]);
            }

        }

        // Tick all entities on the server and collect their public states
        var states = [];
        for(i = 0, l = entities.length; i < l; i++) {

            var entity = entities[i];
            states.push([
                entity.getId(),
                1,
                entity.tick(this._tickCount, this._config.maxStateBufferSize),
                entity.getEvents()
            ]);

        }

        // Send state updates and events to all players
        var eventData = bison.encode([Message.SERVER_GAME_EVENTS, events]);
        for(i = 0, l = players.length; i < l; i++) {
            this._sendPlayerState(previousTick, players[i], states);
            players[i].send(eventData);
        }

    },


    // Network (Receiving) ----------------------------------------------------
    _onConnection: function(client) {
        this.log('Client connected ', client);
    },

    _onMessage: function(client, message) {

        try {
            this._onClientMessage(client, bison.decode(message));

        } catch(e) {
            client.log('Invalid message data received.');
        }

    },

    _onClose: function(client, reason) {

        if (client.player) {
            this.removePlayer(client.player);
            client.player.destroy();
            client.player = null;
        }

        this.log('Client dis-connected ', client, ' ', reason);

    },


    // Message Handling -------------------------------------------------------
    _onClientMessage: function(client, msg) {

        if (!util.isValidMessage(msg)) {
            client.log('Invalid message data ', msg);

        } else {

            var type = msg[0],
                data = msg[1],
                player = client.player,
                entity = player ? player.getEntity() : null;

            if (type === Message.CLIENT_JOIN) {
                this._onMessageClientJoin(client, player, entity, data);

            } else if (type === Message.CLIENT_SPECTATE) {
                // TODO remove old player if there is already one present
                // TODO create spectator only player

            } else if (type === Message.CLIENT_PONG) {
                this._onMessageClientPong(client, player, entity, data);

            } else if (type === Message.CLIENT_STATE) {
                this._onMessageClientState(client, player, entity, data);

            } else if (type === Message.CLIENT_EVENT) {
                this._onMessageClientEvent(client, player, entity, data);

            } else {
                this.log('Unhandled message from ', client, ': ', msg);
            }

        }

    },

    _onMessageClientJoin: function(client, player, entity, data) {

        if (this._players.length >= this._config.maxPlayers) {
            this.log('Failed to join game, max player amount reached ', client);

        } else if (!util.isValidPlayerName(data)) {
            this.log('Invalid player name');

        } else {
            client.player = new this._playerClass(this, client, data);
            this.addPlayer(client.player);
        }

    },

    _onMessageClientPong: function(client, player, entity, data) {

        if (!player) {
            client.log('Pong without player');

        } else if (!util.isValidPong(data)) {
            player.log('Invalid pong message');

        } else {
            player.pong(data);
        }

    },

    _onMessageClientState: function(client, player, entity, data) {

        if (!util.isValidClientState(data)) {
            client.log('Invalid entity state message data');

        } else if (!player) {
            client.log('Entity state event without client player');

        } else if (!entity) {
            player.log('Entity state event without owned entity');

        } else {

            // We only accept state updates with a delta of 1 tick
            var dt = Math.abs(entity.getClientTick() - data[0]);

            if (dt === 1 || dt === 255) {
                // TODO check for more potential de-sync issues
                entity.setClientTick(data[0]);
                entity.applyState(data[0], data[1], this._config);

            } else {
                entity.log('Invalid tick delta for client state update ', dt);
            }

        }

    },

    _onMessageClientEvent: function(client, player, entity, data) {

        if (!util.isValidEvent(data)) {
            client.log('Invalid event message data');

        } else if (!Server.EventClasses[data[2]]) {
            client.log('Event for non-registered class ID: ', data[2]);

        } else {
            var event = new Server.EventClasses[data[2]](this);
            event.init.apply(event, data[3]);
            this._onEvent(client, player, entity, data[0], data[1], event);
        }

    },

    _onEvent: function(client, player, entity, tick, target, event) {

        // Game Event
        if (target === 0) {
            event.applyGame(client, this._fullTickCount, this._config);

        // Player
        } else if (target === 1) {

            if (!player) {
                client.log('Player event without player');

            } else {
                event.applyPlayer(player, this._fullTickCount, this._config);
            }

        // Entity
        } else if (target === 2) {

            if (!entity) {
                player.log('Entity event without owned entity');

            } else if (entity.getClientTick() !== tick) {
                player.log('Invalid tick for entity event');

            } else {

                // Rewind all players to the specified client tick
                this._rewindEntities(tick, entity);

                // Apply Event
                event.applyEntity(
                    player.getEntity(),
                    this._fullTickCount,
                    this._config
                );

                // Forward players back to their actual, current state
                this._forwardEntities(entity);

            }

        }

    },


    // Network Sending --------------------------------------------------------
    _send: function(msg) {
        this.getPlayers().forEach(function(player) {
            player.send(msg);
        });
    },

    _sendSetup: function(player) {

        player.send(bison.encode([
            Message.SERVER_GAME_SETUP,
            [
                this._tickCount,
                this._config,
                this._level.serialize()
            ]
        ]));

    },

    _sendPlayers: function(player) {

        var players = this.getPlayers();
        for(var i = 0, l = players.length; i < l; i++) {
            player.send(bison.encode([
                Message.SERVER_PLAYER_JOIN,
                players[i].serialize(false)
            ]));
        }

    },

    _sendEntities: function(player) {

        var entities = this.getEntities();
        for(var i = 0, l = entities.length; i < l; i++) {
            player.send(bison.encode([
                Message.SERVER_ENTITY_ADD,
                entities[i].serialize(false)
            ]));
        }

    },

    _sendPlayerState: function(previousTick, player, states) {

        // Calculate the actual state that's visibile to the specific client
        var stateData = [];

        for(var i = 0, l = states.length; i < l; i++) {

            // Create a copy of the state
            var state = states[i].slice(),
                id = state[0],
                entity = this._entities.get(id),
                events = state[3];

            // Check entity state visibility
            state[1] = entity.isVisibleToPlayer(player) ? 1 : 0;

            // Remove state data for hidden entities
            if (!state[1]) {
                state[2] = null;
            }

            // Private Entity State (send to players who are "friends" of the entity)
            if (entity.isFriendOfPlayer(player)) {
                state[2] = entity.getPrivateState();
            }

            // Filter events based on their visibility to players
            state[3] = [];

            for(var e = 0, el = events.length; e < el; e++) {

                var event = events[e];
                if (event.isVisibleToPlayer(player)) {
                    state[3].push([event.TypeId, event.serialize()]);
                }

            }

            stateData.push(state);

        }

        // Send out the update along with the last confirmed tick for the client
        // (clients without entites always receive the previous server tick)
        var playerEntity = player.getEntity();
        player.send(bison.encode([
            Message.SERVER_GAME_TICK, [
                playerEntity ? playerEntity.getClientTick() : previousTick,
                stateData,
                player.getPing()
            ]
        ]));

        // Ping measurement
        player.ping(previousTick, this.getTickRate());

    },


    // Logging ----------------------------------------------------------------
    log: function() {
        util.log(this.toString(), arguments);
    },

    toString: function() {
        return '[ Server ' + this._hostname + ':' + this._port + ' ]';
    }

});


// Register Event and Entity Classes ------------------------------------------
Server.addEntityClass(Entity);


// Exports --------------------------------------------------------------------
module.exports = Server;

