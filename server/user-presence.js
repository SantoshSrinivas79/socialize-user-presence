UserSessions._ensureIndex({userId:1});
UserSessions._ensureIndex({serverId:1});
UserSessions._ensureIndex({sessionId:1});

var cleanupFunctions = [];
var userOnlineFunctions = [];
var userOfflineFunctions = [];
var userIdleFunctions = [];
var sessionConnectedFunctions = [];
var sessionDisconnectedFunctions = [];

UserPresence = {};

UserPresence.onSessionConnected = function (sessionConnectedFunction){
    if(_.isFunction(sessionConnectedFunction)){
        sessionConnectedFunctions.push(sessionConnectedFunction);
    }else{
        throw new Meteor.Error("Not A Function", "UserPresence.onSessionConnected requires function as parameter");
    }
};

var sessionConnected = function(connection, userId) {
    _.each(sessionConnectedFunctions, function(sessionFunction){
        sessionFunction(userId, connection);
    });
};

UserPresence.onSessionDisconnected = function (sessionDisconnectedFunction){
    if(_.isFunction(sessionDisconnectedFunction)){
        sessionDisconnectedFunctions.push(sessionDisconnectedFunction);
    }else{
        throw new Meteor.Error("Not A Function", "UserPresence.onSessionDisconnected requires function as parameter");
    }
};

var sessionDisconnected = function(connection, userId) {
    _.each(sessionDisconnectedFunctions, function(sessionFunction){
        sessionFunction(userId, connection);
    });
};


UserPresence.onUserOnline = function(userOnlineFunction) {
    if(_.isFunction(userOnlineFunction)){
        userOnlineFunctions.push(userOnlineFunction);
    }else{
        throw new Meteor.Error("Not A Function", "UserPresence.onUserOnline requires function as parameter");
    }
};

var userOnline = function(userId, connection) {
    _.each(userOnlineFunctions, function(onlineFunction){
        onlineFunction(userId, connection);
    });
};

UserPresence.onUserIdle = function(userIdleFunction) {
    if(_.isFunction(userIdleFunction)){
        userIdleFunctions.push(userIdleFunction);
    }else{
        throw new Meteor.Error("Not A Function", "UserPresence.onUserIdle requires function as parameter");
    }
};

var userIdle = function(userId, connection) {
    _.each(userIdleFunctions, function(idleFunction){
        idleFunction(userId, connection);
    });
};

UserPresence.onUserOffline = function(userOfflineFunction) {
    if(_.isFunction(userOfflineFunction)){
        userOfflineFunctions.push(userOfflineFunction);
    }else{
        throw new Meteor.Error("Not A Function", "UserPresence.onUserOffline requires function as parameter");
    }
};

var userOffline = function(userId, connection) {
    _.each(userOfflineFunctions, function(offlineFunction){
        offlineFunction(userId, connection);
    });
};

UserPresence.onCleanup = function(cleanupFunction){
    if(_.isFunction(cleanupFunction)){
        cleanupFunctions.push(cleanupFunction);
    }else{
        throw new Meteor.Error("Not A Function", "UserPresence.onCleanup requires function as parameter");
    }
};

var cleanup = function(sessions) {
    _.each(cleanupFunctions, function(cleanupFunction){
        cleanupFunction(sessions);
    });
};

ServerPresence.onCleanup(function(serverId){
    if(serverId){
        var sessionIds = UserSessions.find({serverId:serverId}, {fields:{sessionId:true}}).map(function(session){
            return session.sessionId;
        });
        cleanup(sessionIds);
        UserSessions.remove({serverId:serverId});
    }else{
        cleanup();
        UserSessions.remove({});
    }
});

userConnected = function (userId, serverId, connection) {
    UserSessions.insert({serverId:serverId, userId:userId, _id:connection.id, status:2});
    sessionConnected(connection, userId);
    determineStatus(userId, connection);
};

userDisconnected = function (connection, userId) {
    UserSessions.remove(connection.id);
    sessionDisconnected(connection, userId);
    determineStatus(userId, connection);
};

var determineStatus = function(userId, connection) {
    var status = 0;
    var sessions = UserSessions.find({userId:userId}, {fields:{status:true}});
    var sessionCount = sessions.fetch().length;

    if(sessionCount > 0){
        status = 1;
        sessions.forEach(function(session){
            if(session.status === 2){
                status = 2;
            }
        });
    }

    switch(status){
        case 0:
            userOffline(userId, connection);
            break;
        case 1:
            userIdle(userId, connection);
            break;
        case 2:
            userOnline(userId, connection);
            break;
    }
};
