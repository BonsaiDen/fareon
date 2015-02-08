// Utilties -------------------------------------------------------------------
var util = {

    // Logging Abstraction ----------------------------------------------------
    log: function(instance, messages) {
        util._log(
            instance + ' >> ' + Array.prototype.slice.call(messages).join('')
        );
    },

    _log: function(message) {
        process.stdout.write(message + '\n');
    },

    mergeWithDefaults: function(config, defaults) {

        config = config || {};

        for(var i in defaults) {
            if (defaults.hasOwnProperty(i)) {
                if (!config.hasOwnProperty(i)) {
                    config[i] = defaults[i];
                }
            }
        }

        return config;

    },


    // Message Validation -----------------------------------------------------
    isValidMessage: function(msg) {
        return msg instanceof Array
            && msg.length === 2
            && util.isValidMessageType(msg[0]);
    },

    isValidMessageType: function(action) {
        return typeof action === 'number'
            && !isNaN(action)
            && action >= 0;
    },

    isValidTick: function(tick) {
        return typeof tick === 'number'
            && !isNaN(tick)
            && tick >= 0 && tick <= 255;
    },

    isValidPong: function(time) {
        return typeof time === 'number'
            && !isNaN(time)
            && time >= 0 && time <= 10000;
    },

    isValidClientState: function(msg) {
        return msg instanceof Array
            && msg.length > 1
            && util.isValidTick(msg[0])
            && msg[1] instanceof Array;
    },

    isValidEvent: function(msg) {
        return msg instanceof Array
            && msg.length === 4
            && util.isValidTick(msg[0])
            && util.isValidEventTarget(msg[1])
            && util.isValidEventTypeId(msg[2])
            && msg[3] instanceof Array;
    },

    isValidEventTarget: function(target) {
        return target === 0 || target === 1 || target === 2;
    },

    isValidEventTypeId: function(typeId) {
        return typeof typeId === 'number'
            && !isNaN(typeId)
            && typeId >= 0;
    },

    isValidPlayerName: function(name) {
        return (/[0-9a-zA-Z_-]{1,16}/).test(name);
    }

};


// Exports --------------------------------------------------------------------
module.exports = util;

