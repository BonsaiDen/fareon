// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class,
    Action = require('../shared/Action');


// FPS Player Base Class ------------------------------------------------------
// ----------------------------------------------------------------------------
var Player = Class(function(client, id, isLocal) {

    // References
    this._client = client;

    // Basics
    this._id = id;
    this._isLocal = isLocal;

    // Input States
    this._inputStates = [];

    // Position State
    this._state = {
        x: 0,
        y: 0,
        z: 0,
        r: 0
    };

    this._lastState = {
        x: 0,
        y: 0,
        z: 0,
        r: 0
    };


}, {

    // Public -----------------------------------------------------------------
    update: function() {
    },

    tick: function(localTick, remoteTick, state, config) {

        // Control Local Player
        if (this._isLocal) {

            // Replay local inputs against the last confirmed server state
            this._replayInputs(localTick, remoteTick, state);

            // Apply inputs
            var input = this._getInput(localTick % 256, config.maxStateBufferSize);
            if (input !== null) {
                this._applyInput(input, config);
            }

            // Send State Update to Server
            this._sendState(localTick % 256);

        // Update the state of remote players
        } else {
            this._lastState.x = this._state.x;
            this._lastState.y = this._state.y;
            this._lastState.z = this._state.z;
            this._lastState.r = this._state.r;
            this._state.x = state[0];
            this._state.y = state[1];
            this._state.z = state[2];
            this._state.r = state[3];
        }

    },

    sendEvent: function(type, data) {
        this._client.send([
            Action.CLIENT_EVENT, [
                this._client.getTick() % 256,
                type,
                data
            ]
        ]);
    },

    destroy: function() {
        this._lastState = null;
        this._state = null;
        this._inputStates = null;
        this._client = null;
    },


    // Updates ----------------------------------------------------------------
    applyInput: function(velocity, inputState, config) {
        return velocity;
    },

    applyState: function(state) {
        this._state.x = state[0];
        this._state.y = state[1];
        this._state.z = state[2];
        this._state.r = state[3];
        this._lastState.x = this._state.x;
        this._lastState.y = this._state.y;
        this._lastState.z = this._state.z;
        this._lastState.r = this._state.r;
    },

    applyData: function() {
    },

    applyEvent: function(localTick, remoteTick, event, config) {
    },


    // Getters ----------------------------------------------------------------
    isLocal: function() {
        return this._isLocal;
    },

    getId: function() {
        return this._id;
    },

    getInput: function() {
        return [];
    },

    getState: function() {
        return [
            this._state.x - this._lastState.x,
            this._state.y - this._lastState.y,
            this._state.z - this._lastState.z,
            this._state.r
        ];
    },


    // Internal ----------------------------------------------------------------
    _getInput: function(localTick, maxStates) {

        // Serialize and store player inputs
        var input = this.getInput();
        if (input !== null) {

            var inputState = [localTick % 256].concat(input);
            this._inputStates.push(inputState);

            if (this._inputStates.length > maxStates) {
                this._inputStates.shift();
            }

            return inputState;

        } else {
            return null;
        }

    },

    _replayInputs: function(localTick, remoteTick, state) {

        // Reset local state to last one confirmed by the server
        this._state.x = state[0];
        this._state.y = state[1];
        this._state.z = state[2];
        this._lastState.x = state[0];
        this._lastState.y = state[1];
        this._lastState.z = state[2];

        // Find the last confirmed local input
        var confirmed = -1,
            i,
            l;

        // Search backwards through the input state buffer
        for(i = this._inputStates.length - 1; i >= 0; i--) {
            if (this._inputStates[i][0] === remoteTick) {
                confirmed = i;
                break;
            }
        }

        // Now apply all unconfirmed inputs onto the server state
        // This forwards us back to the previous local state, but will include
        // any server side corrections
        for(i = confirmed + 1, l = this._inputStates.length; i < l; i++) {
            this._applyInput(this._inputStates[i], this._client.getConfig());
        }

        // Drop all confirmed inputs
        if (confirmed !== -1) {
            this._inputStates.splice(0, confirmed);
        }

    },

    _applyInput: function(inputState, config) {

        // Store last state for interpolation
        this._lastState.x = this._state.x;
        this._lastState.y = this._state.y;
        this._lastState.z = this._state.z;
        this._lastState.r = this._state.r;

        var velocity = {
           x: 0,
           y: 0,
           z: 0,
           r: 0
        };

        // Apply Input to velocity
        this.applyInput(velocity, inputState, config);

        // Apply Level Collision
        velocity = this._client.getLevel().applyCollision(this, this._state, velocity);

        this._state.x += velocity.x;
        this._state.y += velocity.y;
        this._state.z += velocity.z;

    },

    _sendState: function(tick) {
        this._client.send([
            Action.CLIENT_STATE,
            [tick].concat(this.getState())
        ]);
    }

});

// Exports --------------------------------------------------------------------
module.exports = Player;

