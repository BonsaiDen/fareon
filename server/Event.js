// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class;


// Server Event Base Class ----------------------------------------------------
// ----------------------------------------------------------------------------
var Event = Class(function(server) {

    // References
    this._server = server;

}, {

    // Initialization ---------------------------------------------------------
    init: function() {
    },


    // Interface --------------------------------------------------------------
    applyGame: function(server) {
    },

    applyPlayer: function(player) {

    },

    applyEntity: function(entity) {

    },


    // Serialization ----------------------------------------------------------
    serialize: function() {
        return [];
    }

});


// Exports --------------------------------------------------------------------
module.exports = Event;

