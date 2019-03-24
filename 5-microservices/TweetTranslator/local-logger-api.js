var eventBusPublisher = require("./EventPublisher.js");

var localLoggerAPI = module.exports;
var moduleName = "accs.localLoggerAPI";

var logTopic = "logTopic";

localLoggerAPI.DEBUG = "debug";
localLoggerAPI.INFO = "info";
localLoggerAPI.WARN = "warning";
localLoggerAPI.ERROR = "error";

localLoggerAPI.log = function (message, moduleName, loglevel) {
    var logEntry = {
        "logLevel": loglevel
        , "module": moduleName
        , "message": message
        , "timestamp": new Date().toLocaleString()
    }
    try {
    eventBusPublisher.publishEvent("logEntry"+logEntry.timestamp, logEntry, logTopic);
} catch (e) {}
}//log


console.log("Local Logger API  initialized running against Kafka Topic " + logTopic);
