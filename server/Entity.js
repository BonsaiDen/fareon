// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class,
    State = require('../shared/State'),
    util = require('../shared/util');


// Entity Base Class ----------------------------------------------------------
// ----------------------------------------------------------------------------
var Entity = Class(function(server, stateClass) {

    // Entity State Class
    stateClass = stateClass || State;

    // References
    this._server = server;
    this._player = null;

    // Basics
    this._id = null;

    // Last received input tick from the client
    this._clientTick = server.getTick() - 1;

    // State
    this._lastState = new stateClass(server);
    this._state = new stateClass(server);
    this._velocity = new stateClass(server);

    // Previous States
    this._states = [];
    this._savedState = null;

    // Events to be send to clients with the next tick
    this._eventQueue = [];

}, {

    // Public -----------------------------------------------------------------
    sendEvent: function(event) {
        this._eventQueue.push(event);
    },

    tick: function(tick, maxStateBufferSize) {

        // Store state of the last tick
        this._lastState.set(this._state);

        // Store private state on the server
        var state = this._state.get(true);
        this._states.push({
            state: state,
            tick: tick,
            clientTick: this._clientTick
        });

        if (this._states.length > maxStateBufferSize) {
            this._states.shift();
        }

        // Return public state
        return this._state.get(false);

    },

    rewind: function(tick) {

        this._savedState = this._state.get(true);
        for(var i = this._states.length - 1; i >= 0; i--) {

            var state = this._states[i];
            if (state.tick === tick) {
                // TODO if we don't find any state, rewind to the oldest possible?
                this.setState(state.state);
                break;
            }

        }

    },

    forward: function() {
        this.setState(this._savedState);
    },

    destroy: function() {

        // Remove from server
        this._server.removeEntity(this);

        // Clear references
        this._state = null;
        this._states.length = 0;
        this._states = null;
        this._server = null;
        this._remote = null;

    },


    // Updates ----------------------------------------------------------------
    applyState: function(tick, state, config) {

        // Set velocity from state delta
        this._state.velocity(state, this._velocity);

        // Apply Level Collision
        this._server.getLevel().applyEntityCollision(
            this, this._state, this._velocity
        );

        // Update state with velocity
        this._state.update(this._velocity);

    },


    // Setter -----------------------------------------------------------------
    setId: function(id) {
        this._id = id;
    },

    setPlayer: function(player) {

        this._player = player;
        this._server.setEntityPlayer(this, player);

        this.log('Player Set');

    },

    setClientTick: function(tick) {
        this._clientTick = tick;
    },

    setState: function(state) {
        this._state.set(state, false);
    },


    // Getter -----------------------------------------------------------------
    getId: function() {
        return this._id;
    },

    getClientTick: function() {
        return this._clientTick;
    },

    getPlayer: function() {
        return this._player;
    },

    getPrivateState: function() {
        return this._state.get(true);
    },

    getEvents: function() {
        var events = this._eventQueue.slice();
        this._eventQueue.length = 0;
        return events;
    },

    isVisible: function() {
        return true;
    },

    isVisibleToPlayer: function(player) {
        return true;
    },

    isFriendOfPlayer: function(player) {
        return this._player === player;
    },


    // Serialization ----------------------------------------------------------
    serialize: function(isPrivate) {
        return [
            this._id,
            this.TypeId,
            this._player ? this._player.getId() : 0,
            this._state.get(isPrivate)
        ];
    },


    // Logging ----------------------------------------------------------------
    log: function() {
        util.log(this.toString(), arguments);
    },

    toString: function() {

        if (this._player) {
            return '[ Entity #' + this._id + ' | ' + this._player + ' ]';

        } else {
            return '[ Entity #' + this._id + ' | No Player ]';
        }

    }

});


// Exports --------------------------------------------------------------------
module.exports = Entity;

