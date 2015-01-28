'use strict';

// Action IDs -----------------------------------------------------------------
var actions = [
    'SERVER_GAME_SETUP',
    'SERVER_GAME_TICK',
    'SERVER_PLAYER_JOIN',
    'SERVER_PLAYER_EVENT',
    'SERVER_PLAYER_LEAVE',
    'CLIENT_JOIN',
    'CLIENT_EVENT',
    'CLIENT_STATE'
];

// Create Mappings ------------------------------------------------------------
var reverseMap = {};
actions.forEach(function(action, index) {
    reverseMap[index] = action;
    exports[action] = index;
});

exports.getNameFromId = function(id) {
    return reverseMap[id];
};

