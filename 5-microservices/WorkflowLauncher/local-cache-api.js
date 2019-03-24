var request = require('request')
    ;


//this module talks to a locally running Redis Cache

var localCacheAPI = module.exports;
var moduleName = "accs.localCacheAPI";
var moduleVersion = "0.9.2";
var Redis = require("redis");
//var RedisLock = require("redis-lock");
var redisHost = process.env.REDIS_HOST || "192.168.99.100";
var redisPort = process.env.REDIS_PORT || 32657;

var redisClient = Redis.createClient({ "host": redisHost, "port": redisPort });
//var redisLock = RedisLock(redisClient);
localCacheAPI.getFromCache = function (key, callback) {
    try {
        console.log("get document from cache api with key " + key);
        redisClient.get(key, function (err, reply) {
            if (err) {
                console.error('ERROR in getting document from cache ' + err);
                callback(null);
            } else {
                callback(JSON.parse(reply));
            }//else
        });//get
    } catch (e) {
        console.error('ERROR in accessing redis ' + e);
        callback(null);
    }
}//getFromCache

localCacheAPI.putInCache = function (key, value, callback) {
    console.log(`Go put in cache under key ${key} the value ${JSON.stringify(value)} `)
    try {
            console.log("putInCache Callback ");
            redisClient.set(key, JSON.stringify(value));
            callback("Was put in cache");
    } catch (e) {
        console.log("Failed to put in cache " + JSON.stringify(e))
        callback("Failed to put in cache " + JSON.stringify(e));
    }
}//putInCache


console.log("Local Cache API (version " + moduleVersion + ") initialized running against Redis instance at " + redisHost + ":" + redisPort);
