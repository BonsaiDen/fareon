// Message Definitions --------------------------------------------------------
var Message = {

    _index: 0,
    _map: {},

    _internal: [
        'SERVER_GAME_SETUP',
        'SERVER_GAME_TICK',
        'SERVER_GAME_EVENTS',
        'SERVER_PLAYER_JOIN',
        'SERVER_PLAYER_EVENT',
        'SERVER_PLAYER_LEAVE',
        'SERVER_ENTITY_ADD',
        'SERVER_ENTITY_REMOVE',
        'SERVER_ENTITY_SET_PLAYER',
        'SERVER_PING',
        'CLIENT_PONG',
        'CLIENT_JOIN',
        'CLIENT_EVENT',
        'CLIENT_STATE'
    ],

    define: function(action) {
        Message._map[Message._index++] = action;
        Message[action] = Message._index - 1;
    },

    getNameFromId: function(id) {
        return Message._map[id];
    }

};


// Core Message IDs -----------------------------------------------------------
Message._internal.forEach(Message.define);


// Exports --------------------------------------------------------------------
module.exports = Message;

