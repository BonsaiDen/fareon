// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class;


// FPS Level Base Class -------------------------------------------------------
// ----------------------------------------------------------------------------
var Level = Class(function(client) {

    // References
    this._client = client;

}, {

    // Public -----------------------------------------------------------------
    destroy: function() {
        this._client = null;
    },


    // Getter -----------------------------------------------------------------
    isClient: function() {
        return true;
    },

    isServer: function() {
        return false;
    },

    getParent: function() {
        return this._client;
    },


    // Collision --------------------------------------------------------------
    applyCollision: function(player, position, velocity) {
        return velocity;
    },


    // Serialization ----------------------------------------------------------
    restore: function(data) {
    }

});


// Exports --------------------------------------------------------------------
module.exports = Level;

