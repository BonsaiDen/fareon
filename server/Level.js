// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class;


// Server Level Base Class ----------------------------------------------------
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
    getParent: function() {
        return this._server;
    },

    isClient: function() {
        return false;
    },

    isServer: function() {
        return true;
    },


    // Collision --------------------------------------------------------------
    applyEntityCollision: function(entity, position, velocity) {
        return velocity;
    },


    // Serialization ----------------------------------------------------------
    serialize: function() {
        return [];
    }

});


// Exports --------------------------------------------------------------------
module.exports = Level;

