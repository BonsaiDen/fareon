// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('./lib/Class').Class;


// Client Event Base Class ----------------------------------------------------
// ----------------------------------------------------------------------------
var Event = Class(function(parent) {

    // References
    this._parent = parent;

    // Event Tick
    this._tick = -1;

}, {

    // Initialization ---------------------------------------------------------
    init: function() {
    },


    // Interface --------------------------------------------------------------
    applyGame: function(client, tick, config) {
    },

    applyPlayer: function(player, tick, config) {

    },

    applyEntity: function(entity, tick, config) {

    },


    // Setter -----------------------------------------------------------------
    setTick: function(tick) {
        this._tick = tick;
    },


    // Getter -----------------------------------------------------------------
    getTick: function() {
        return this._tick;
    },

    isServer: function() {
        return this._parent.isServer();
    },

    isClient: function() {
        return this._parent.isClient();
    },

    isVisibleToPlayer: function(player) {
        return true;
    },


    // Serialization ----------------------------------------------------------
    serialize: function() {
        return [];
    }

});


// Exports --------------------------------------------------------------------
module.exports = Event;

