// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class;


// Client Level Base Class ----------------------------------------------------
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
    getParent: function() {
        return this._client;
    },

    isClient: function() {
        return true;
    },

    isServer: function() {
        return false;
    },


    // Collision --------------------------------------------------------------
    applyEntityCollision: function(entity, position, velocity) {
    },


    // Serialization ----------------------------------------------------------
    restore: function(data) {
    }

});


// Exports --------------------------------------------------------------------
module.exports = Level;

