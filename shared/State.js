// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('./lib/Class').Class;


// State Encapsulation --------------------------------------------------------
// ----------------------------------------------------------------------------
var State = Class(function(parent) {

    // Reference to Server / Client
    this._parent = parent;

    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.r = 0;

}, {

    set: function(state, merge) {

        if (state instanceof Array) {
            this.x = state[0];
            this.y = state[1];
            this.z = state[2];

            if (!merge) {
                this.r = state[3];
            }

        } else {
            this.x = state.x;
            this.y = state.y;
            this.z = state.z;

            if (!merge) {
                this.r = state.r;
            }

        }

    },

    get: function() {
        return [
            this.x,
            this.y,
            this.z,
            this.r
        ];
    },

    update: function(state) {
        this.x += state.x;
        this.y += state.y;
        this.z += state.z;
        this.r += state.r;
    },

    reset: function() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.r = 0;
    },

    diff: function(lastState) {
        return [
            this.x - lastState.x,
            this.y - lastState.y,
            this.z - lastState.z,
            this.r
        ];
    },

    velocity: function(state, velocity) {

        var config = this._parent.getConfig(),
            dx = state[0],
            dy = state[1],
            dz = state[2],
            r = state[3],
            dr = Math.atan2(Math.sin(r - this.r), Math.cos(r - this.r)),
            mr = Math.atan2(dy, dx),
            dist = Math.sqrt(dx * dx + dy * dy);

        // Limit Speed (TODO limit dz)
        dx = Math.cos(mr) * Math.min(dist, config.maxPlayerSpeed);
        dy = Math.sin(mr) * Math.min(dist, config.maxPlayerSpeed);

        velocity.x = dx;
        velocity.y = dy;
        velocity.z = dz;
        velocity.r = dr;

    }

});


// Exports --------------------------------------------------------------------
module.exports = State;

