// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class,
    State = require('../shared/State'),
    Message = require('../shared/Message');


// Entity Base Class ------------------------------------------------------
// ----------------------------------------------------------------------------
var Entity = Class(function(client, stateClass) {

    // Entity State Class
    stateClass = stateClass || State;

    // References
    this._client = client;
    this._player = null;

    // Basics
    this._id = null;
    this._isVisible = null;

    // Input States
    this._inputStates = [];

    // Position State
    this._state = new stateClass(client);
    this._lastState = new stateClass(client);
    this._velocity = new stateClass(client);

}, {

    // Public -----------------------------------------------------------------
    show: function() {
        this._isVisible = true;
    },

    hide: function() {
        this._isVisible = false;
    },

    update: function() {
    },

    tick: function(localTick, remoteTick, state, config) {

        // Control Local Player
        if (this.isControlled()) {

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
            this._lastState.set(this._state, false);
            this._state.set(state, false);
        }

    },

    sendEvent: function(event) {

        event.setTick(this._client.getTick());

        this._client.send([
            Message.CLIENT_EVENT, [
                event.getTick(), // Event Tick
                2, // Event target (0 Game, 1 Player, 2 Entity)
                event.TypeId, // Event Class Type ID
                event.serialize() // Event Data
            ]
        ]);

    },

    clearInput: function() {
        this._inputStates.length = 0;
    },

    destroy: function() {
        this._lastState = null;
        this._state = null;
        this._inputStates = null;
        this._client = null;
    },


    // Updates ----------------------------------------------------------------
    applyInput: function(velocity, inputState, config) {

    },

    applyState: function(state) {
        this._state.set(state, false);
        this._lastState.set(this._state, false);
    },


    // Setters ----------------------------------------------------------------
    setId: function(id) {
        this._id = id;
    },

    setPlayer: function(player) {
        this._player = player;
    },


    // Getters ----------------------------------------------------------------
    getId: function() {
        return this._id;
    },

    getPlayer: function() {
        return this._player;
    },

    getInput: function() {
        return [];
    },

    isControlled: function() {
        return this._player && this._player.isLocal();
    },

    isVisible: function() {
        return this._isVisible;
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

        // Merge state confirmed by the server with local states
        this._state.set(state, true);
        this._lastState.set(state, true);

        // Find the last confirmed local input
        var confirmed = -1,
            i, l;

        // Search backwards through the input state buffer to find the last
        // confirmed input state
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
        this._lastState.set(this._state, false);

        // Reset velocity
        this._velocity.reset();

        // Apply Input to velocity
        this.applyInput(this._velocity, inputState, config);

        // Apply Level Collision
        this._client.getLevel().applyEntityCollision(this, this._state, this._velocity);

        // Update state with velocity
        this._state.update(this._velocity);

    },

    // Network ----------------------------------------------------------------
    _sendState: function(tick) {
        this._client.send([
            Message.CLIENT_STATE,
            [tick, this._state.diff(this._lastState)]
        ]);
    }

});


// Exports --------------------------------------------------------------------
module.exports = Entity;

