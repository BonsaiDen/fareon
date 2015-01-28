'use strict';

// Utilties -------------------------------------------------------------------
var util = {

    // Logging Abstraction ----------------------------------------------------
    log: function(logger, instance, messages) {
        (logger || util._log)(
            instance + ' >> ' + Array.prototype.slice.call(messages).join('')
        );
    },

    _log: function(message) {
        console.log(message);
    },

    concat: function(id, separator, args) {
        return [id, separator].concat(Array.prototype.slice.call(args));
    },

    // Message Validation -----------------------------------------------------
    isValidMessage: function(msg) {
        return msg instanceof Array
            && msg.length === 2
            && util.isValidActionType(msg[0]);
    },

    isValidActionType: function(action) {
        return typeof action === 'number'
            && !isNaN(action)
            && action >= 0;
    },

    isValidTick: function(tick) {
        return typeof tick === 'number'
            && !isNaN(tick)
            && tick >= 0 && tick <= 255;
    },

    isValidClientState: function(msg) {
        return msg instanceof Array
            && msg.length > 1
            && util.isValidTick(msg[0]);
    },

    isValidEvent: function(msg) {
        return msg instanceof Array
            && msg.length === 3
            && util.isValidTick(msg[0]);
    },

    isValidPlayerName: function(name) {
        return (/[0-9a-zA-Z_-]{1,16}/).test(name);
    }

};


// Exports --------------------------------------------------------------------
module.exports = util;

