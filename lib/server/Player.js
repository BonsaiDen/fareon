// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class,
    util = require('../shared/util');


// FPS Player Base Class ------------------------------------------------------
// ----------------------------------------------------------------------------
var Player = Class(function(server, remote, name) {

    // References
    this._server = server;
    this._remote = remote;

    // Basics
    this._id = Player.ID++;
    this._name = name;

    // Position / Rotation
    this._position = {
        x: 0,
        y: 0,
        z: 0,
        r: 0
    };

    // Last received input tick from the client
    this._clientTick = server.getTick();

    // Previous State
    this._states = [];
    this._savedState = null;

    // Events to be send with the next tick
    this._events = [];

}, {

    // Statics ----------------------------------------------------------------
    $ID:  0,


    // Public -----------------------------------------------------------------
    send: function(msg) {
        this._remote.send(msg);
    },

    sendEvent: function(event) {
        this._events.push(event);
    },

    tick: function(tick, maxStateBufferSize) {

        // Store private state on the server
        var state = this.getState(true);
        this._states.push({
            state: state,
            tick: tick,
            clientTick: this._clientTick
        });

        if (this._states.length > maxStateBufferSize) {
            this._states.shift();
        }

        // Return public state
        return this.getState(false);

    },

    rewind: function(tick) {

        this._savedState = this.getState(true);
        for(var i = this._states.length - 1; i >= 0; i--) {

            var state = this._states[i];
            if (state.tick === tick) {
                this.setState(state.state);
                break;
            }

        }

    },

    forward: function() {
        this.setState(this._savedState);
    },

    setState: function(state) {
        this._position.x = state[0];
        this._position.y = state[1];
        this._position.z = state[2];
        this._position.r = state[3];
    },

    destroy: function() {
        this._position = null;
        this._states.length = 0;
        this._states = null;
        this._server = null;
        this._remote = null;
    },


    // Updates ----------------------------------------------------------------
    applyState: function(state, config) {

        // Store the client tick associated with this state update
        this._clientTick = state[0];

        // Calculate movement angle and other things for verifications
        var dx = state[1],
            dy = state[2],
            dz = state[3],
            r = state[4],
            dr = Math.atan2(Math.sin(r - this._r), Math.cos(r - this._r)),
            mr = Math.atan2(dy, dx),
            speed = Math.sqrt(dx * dx + dy * dy);

        // Limit Speed
        dx = Math.cos(mr) * Math.min(speed, config.maxPlayerSpeed);
        dy = Math.sin(mr) * Math.min(speed, config.maxPlayerSpeed);

        // TODO fully support Z axis (via plain difference check?)
        //dz = Math.sin(mr) * Math.min(speed, config.maxPlayerSpeed);

        // Apply Level Collision
        var vel = this._server.getLevel().applyCollision(
            this,
            this._position, {
                x: dx,
                y: dy,
                z: dz,
                r: dr
            }
        );

        // Update Position
        this._position.x += vel.x;
        this._position.y += vel.y,
        this._position.z += vel.z,
        this._position.r = r;

    },

    applyEvent: function(tick, eventTick, type, data) {
    },


    // Getter -----------------------------------------------------------------
    getId: function() {
        return this._id;
    },

    getInfo: function(isPrivate) {
        return [this._id, isPrivate, this.getState(isPrivate), this.getData()];
    },

    getClientTick: function() {
        return this._clientTick;
    },

    getData: function() {
        return [];
    },

    getState: function(isPrivate) {
        return [
            this._position.x,
            this._position.y,
            this._position.z,
            this._position.r
        ];
    },

    getEvents: function() {
        var events = this._events.slice();
        this._events.length = 0;
        return events;
    },


    // Logging ----------------------------------------------------------------
    log: function() {
        this._server.log.apply(
            this._server,
            util.concat(this.toString(), ' >> ', arguments)
        );
    },

    toString: function() {
        return '[ Player #' + this._id + ' "' + this._name
                + ' | ' + this._remote.toString() + ' ]';
    }

});


// Exports --------------------------------------------------------------------
module.exports = Player;

