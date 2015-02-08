// Dependencies ---------------------------------------------------------------
// ----------------------------------------------------------------------------
var Class = require('./lib/Class').Class,
    RefList = require('./lib/RefList'),
    util = require('./util');


// Shared Interface between Client and Server ---------------------------------
// ----------------------------------------------------------------------------
var Base = Class(function(playerClass, levelClass, config) {

    // Configuration
    this._config = {};
    util.mergeWithDefaults(this._config, config);

    // Players
    this._players = new RefList();

    // Entities
    this._entities = new RefList();

    // Level
    this._level = null;

    // Logic
    this._tickCount = 0;

    // Classes
    this._playerClass = playerClass;
    this._levelClass = levelClass;

    // Network
    this._hostname = null;
    this._port = null;

}, {

    // Statics ----------------------------------------------------------------
    $EntityClassId: 0,
    $EntityClasses: [],

    $addEntityClass: function(entityClass) {
        entityClass.TypeId = Base.EntityClassId++;
        entityClass.prototype.TypeId = entityClass.TypeId;
        Base.EntityClasses.push(entityClass);
    },

    $EventClassId: 0,
    $EventClasses: [],

    $addEventClass: function(eventClass) {
        eventClass.TypeId = Base.EventClassId++;
        eventClass.prototype.TypeId = eventClass.TypeId;
        Base.EventClasses.push(eventClass);
    },


    // Setter -----------------------------------------------------------------
    setLevel: function(data) {
        this._level = new this._levelClass(this);
        this._level.restore(data);
    },


    // Getter -----------------------------------------------------------------
    getTick: function() {
        return this._tickCount % 256;
    },

    getTickRate: function() {
        return this._config.tickRate;
    },

    getTime: function() {
        return this._tickCount * Math.floor(1000 / this.getTickRate());
    },

    getLevel: function() {
        return this._level;
    },

    getConfig: function() {
        return this._config;
    },

    getPlayers: function() {
        return this._players.items;
    },

    getPlayerById: function(id) {
        return this._players.get(id);
    },

    getEntities: function() {
        return this._entities.items;
    },

    getEntityById: function(id) {
        return this._entities.get(id);
    }

});


// Exports --------------------------------------------------------------------
module.exports = Base;

