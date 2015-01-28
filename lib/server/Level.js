// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class;


// FPS Player Base Class ------------------------------------------------------
// ----------------------------------------------------------------------------
var Level = Class(function(server) {

    // References
    this._server = server;

}, {

    // Public -----------------------------------------------------------------
    destroy: function() {
        this._server = null;
    },


    // Getter -----------------------------------------------------------------
    isClient: function() {
        return false;
    },

    isServer: function() {
        return true;
    },

    getParent: function() {
        return this._server;
    },


    // Collision --------------------------------------------------------------
    applyCollision: function(player, position, velocity) {
        return velocity;
    },


    // Serialization ----------------------------------------------------------
    serialize: function() {
        return [];
    }

});


// Exports --------------------------------------------------------------------
module.exports = Level;

