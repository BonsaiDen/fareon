// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class,
    Network = require('./Network'),
    Level = require('./Level'),
    Player = require('./Player'),
    Entity = require('./Entity'),
    Base = require('../shared/Base'),
    Message = require('../shared/Message');


// Client Base Class ----------------------------------------------------------
// ----------------------------------------------------------------------------
var Client = Class(function(playerClass, levelClass) {

    Base(this, playerClass || Player, levelClass || Level, {});

    this._ping = -1;

    this._socket = new Network(
        this._onConnection.bind(this),
        this._onMessage.bind(this),
        this._onClose.bind(this)
    );

}, Base, {

    // Public -----------------------------------------------------------------
    connect: function(port, hostname) {
        this._ping = -1;
        this._port = port;
        this._hostname = hostname;
        this._socket.connect(port, hostname);
    },

    send: function(msg) {
        this._socket.send(msg);
    },

    close: function() {
        this.destroy();
    },

    destroy: function() {

        this.getPlayers().forEach(function(player) {
            player.destroy();
        });

        this.getEntities().forEach(function(entity) {
            entity.destroy();
        });

        if (this._level) {
            this._level.destroy();
            this._level = null;
        }

        this._players.clear();
        this._entities.clear();

    },


    // Getter -----------------------------------------------------------------
    getPing: function() {
        return this._ping;
    },

    isClient: function() {
        return true;
    },

    isServer: function() {
        return false;
    },


    // Network ----------------------------------------------------------------
    setup: function(config) {
    },

    tick: function(localTick, serverTick, states, config) {

        for(var i = 0, l = states.length; i < l; i++) {

            var data = states[i],
                entity = this._entities.get(data[0]),
                visible = data[1],
                state = data[2],
                events = data[3];

            // Apply Entity State
            this._onEntityState(
                localTick, serverTick, config, entity, state, visible
            );

            // Run Entity Events
            for(var e = 0, el = events.length; e < el; e++) {

                // TODO mark events as ignorable?
                var event = events[e],
                    eventClass = Client.EventClasses[event[0]],
                    eventInstance = new eventClass(this);

                eventInstance.setTick(serverTick);
                eventInstance.init.apply(eventInstance, event[1]);
                eventInstance.applyEntity(entity, localTick, config);

            }

        }

    },

    addPlayer: function(id, name, isLocal, data) {

        var player = new this._playerClass(this, name, isLocal);
        player.setId(this._players.set(id, player));
        player.applyData(data);

        return player;

    },

    removePlayer: function(player) {
        this._players.remove(player);
        player.destroy();
    },

    addEntity: function(id, typeId, playerId, state) {

        var entityClass = Client.EntityClasses[typeId],
            entity = new entityClass(this);

        entity.setId(this._entities.set(id, entity));
        entity.applyState(state);
        entity.setPlayer(this.getPlayerById(playerId));

        return entity;

    },

    removeEntity: function(entity) {
        this._entities.remove(entity);
        entity.destroy();
    },


    // Internal ---------------------------------------------------------------
    _onConnection: function() {
        this._socket.send([Message.CLIENT_JOIN, 'Player']);
    },

    _onMessage: function(msg) {

        var type = msg[0],
            data = msg[1];

        switch(type) {

            case Message.SERVER_GAME_SETUP:

                this._tickCount = data[0];
                this._config = data[1];

                this._players.resize(this._config.maxPlayers);
                this._entities.resize(this._config.maxEntities);

                this.setup(this._config);
                this.setLevel(data[2]);

                break;

            case Message.SERVER_PLAYER_JOIN:
                this.addPlayer(data[0], data[1], data[2], data[3]);
                break;

            case Message.SERVER_PLAYER_LEAVE:
                this.removePlayer(this.getPlayerById(data));
                break;

            case Message.SERVER_ENTITY_ADD:
                this.addEntity(data[0], data[1], data[2], data[3]);
                break;

            case Message.SERVER_ENTITY_SET_PLAYER:
                this.getPlayerById(data[1]).setEntity(this.getEntityById(data[0]));
                break;

            case Message.SERVER_ENTITY_REMOVE:
                this.removeEntity(this.getEntityById(data));
                break;

            case Message.SERVER_GAME_TICK:
                this._tickCount++;
                this.tick(this._tickCount, data[0], data[1], this._config);
                this._ping = data[2];
                break;

            case Message.SERVER_PING:
                this._socket.send([Message.CLIENT_PONG, data]);
                break;

            default:
                break;
        }

    },

    _onClose: function() {
        this.close();
    },

    _onEntityState: function(localTick, serverTick, config, entity, state, visible) {

        var entityVisibility = entity.isVisible(),
            wasShown = false;

        // Handle entity visibility
        if (entityVisibility === null) {

            if (!visible) {
                entity.hide();

            } else {
                entity.show();
            }

        } else if (!visible && entityVisibility === true) {
            entity.hide();

        } else if (visible && entityVisibility === false) {
            entity.show();
            wasShown = true;
        }

        // Only tick entites visible to the client (or entites which still
        // receive state because they are private but should not be
        // displayed)
        if (state !== null) {

            entity.tick(localTick, serverTick, state, config);

            // If we changed the visibility on this tick we need to
            // force update the last state in order to avoid visual
            // glitching
            if (wasShown) {
                entity.applyState(state);
            }

        }

    }

});


// Register Event and Entity Classes ------------------------------------------
Client.addEntityClass(Entity);


// Exports --------------------------------------------------------------------
module.exports = Client;

