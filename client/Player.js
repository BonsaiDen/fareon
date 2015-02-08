// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('../shared/lib/Class').Class;


// Player Base Class ----------------------------------------------------------
// ----------------------------------------------------------------------------
var Player = Class(function(client, name, isLocal) {

    // References
    this._client = client;
    this._entity = null;

    // State
    this._id = null;
    this._name = name;
    this._isLocal = isLocal;

}, {

    // Public -----------------------------------------------------------------
    destroy: function() {
        this.setEntity(null);
        this._client = null;
    },


    // Updates ----------------------------------------------------------------
    update: function() {
    },


    // Setters ----------------------------------------------------------------
    setId: function(id) {
        this._id = id;
    },

    setEntity: function(entity) {

        if (this._entity) {
            this._entity.setPlayer(null);
        }

        this._entity = entity;

        if (entity) {
            entity.setPlayer(this);
        }

    },


    // Getters ----------------------------------------------------------------
    getId: function() {
        return this._id;
    },

    getName: function() {
        return this._name;
    },

    getEntity: function() {
        return this._entity;
    },

    isLocal: function() {
        return this._isLocal;
    }

});

// Exports --------------------------------------------------------------------
module.exports = Player;

