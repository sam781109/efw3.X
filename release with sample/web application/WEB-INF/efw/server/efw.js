/**
 * efw framework server library
 * @author Chang Kejun
 */
///////////////////////////////////////////////////////////////////////////////
//The global variables
///////////////////////////////////////////////////////////////////////////////
/**
 * The sever folder absolute path.
 */
var _serverfolder;
/**
 * The event folder absolute path.
 */
var _eventfolder;
/**
 * The boolean flag to show the mode is debug or not.
 */
var _isdebug;
/**
 * The javascript engine.
 */
var _engine;// Mozilla Rhino 1.7 / Oracle Nashorn 1.8

// /////////////////////////////////////////////////////////////////////////////
// The customization to javax.script
// /////////////////////////////////////////////////////////////////////////////
/**
 * Add load function if the javascript engine is Rhino 1.7
 */
if ((_engine.getFactory().getEngineName() + "").indexOf("Rhino") > -1) {
	function load(filename) {
		Packages.efw.script.ScriptManager.load(filename);
	}
	// Add JSON if the javascript engine is Rhion 1.6
	if ((java.lang.System.getProperty("java.version") + "").indexOf("1.6") == 0) {
		load(_serverfolder + "/json2.min.js");
	}
}
/**
 * Add clone function to JSON for deep copy
 */
JSON.clone = function(obj) {
	if (obj === null || obj === undefined) { // null copy
		return obj;
	} else if (typeof obj == "function") { // function executed value
		return obj();
	} else if (typeof obj !== "object") { // simple value copy
		return obj;
	}
	if (obj instanceof Array) { // array deep copy
		var cloneA = [];
		for (var i = 0; i < obj.length; i++)
			cloneA[i] = JSON.clone(obj[i]);
		return cloneA;
	}
	if (obj instanceof Date) { // date copy
		return new Date(obj);
	} else { // object deep copy
		var cloneO = {};
		for ( var key in obj){
			if (key=="debug") continue;// debug function is skipped
			cloneO[key] = JSON.clone(obj[key]);
		}
		return cloneO;
	}
};
// /////////////////////////////////////////////////////////////////////////////
// The classes of the framework
// /////////////////////////////////////////////////////////////////////////////
/**
 * The Efw class
 */
function Efw() {
};
/**
 * Load all classes
 */
load(_serverfolder + "/efw.server.js");
load(_serverfolder + "/efw.server.messages.js");
load(_serverfolder + "/efw.server.format.js");
load(_serverfolder + "/efw.server.properties.js");
load(_serverfolder + "/efw.server.session.js");
load(_serverfolder + "/efw.server.db.js");
load(_serverfolder + "/efw.server.event.js");
load(_serverfolder + "/efw.server.file.js");
load(_serverfolder + "/efw.server.brms.js");
load(_serverfolder + "/efw.server.pdf.js");
load(_serverfolder + "/efw.server.mail.js");
load(_serverfolder + "/efw.server.record.js");
load(_serverfolder + "/efw.server.result.js");
load(_serverfolder + "/efw.server.debug.js");
load(_serverfolder + "/efw.server.excel.js");

/**
 * create instances.
 */
var messages = new EfwServerMessages();
var properties = new EfwServerProperties();
var session = new EfwServerSession();
var db = new EfwServerDb();
var event = new EfwServerEvent();
var file = new EfwServerFile();
var brms = new EfwServerBRMS();
var mail =new EfwServerMail();
var pdf = new EfwServerPdf();

// /////////////////////////////////////////////////////////////////////////////
// The initialization of system.
// /////////////////////////////////////////////////////////////////////////////

/**
 * If it is not debug mode, load all events in system at starting.<br>
 * Then you can see all events in statistics.
 */
EfwServerEvent.prototype._loadAll();
/**
 * Run global event.
 */
if (EfwServerEvent.prototype._load("global") != null)
	EfwServer.prototype.fire(EfwServerEvent.prototype._load("global").event);
// /////////////////////////////////////////////////////////////////////////////
/**
 * The ajax service function<br>
 * It will be called by efwServlet
 * 
 * @param req:
 *            JSON String from client
 * @returns: JSON String to client
 */
function doPost(req) {
	var reqJson = JSON.parse(req); // parse request string to json object
	var eventId = reqJson.eventId; // get eventId from json object
	var params = reqJson.params; // get params from json object
	try{
		var eventInfo = EfwServerEvent.prototype._load(eventId); // to load or get a event
		if(eventInfo.enable==false){
			var message=EfwServerMessages.prototype.EventDisableMessage;
			return JSON.stringify(
					(new Result())
					.alert(message,{"eventId":eventId}));
		}
		var event=eventInfo.event;
		var beginTime = new Date(); // the begin time of event calling
		if (params == null) {
			var ret = JSON.stringify(JSON.clone(event.paramsFormat));
			var endTime = new Date(); // the end time of event first calling
			EfwServerEvent.prototype._updateStatistics(eventId, "first", beginTime,
					endTime);
			return ret;
		} else {
			//login check
			var ret = EfwServer.prototype.checkLogin(eventId);
			if (ret==null){
				var fireFlag = "error"; // the second calling is error
				ret = EfwServer.prototype.checkStyle(event, params);
				try {
					if (ret == null)
						ret = EfwServer.prototype.fire(event, params);
					fireFlag = "second"; // the second calling is success
				} finally {
					var endTime = new Date(); // the end time of event second calling
					EfwServerEvent.prototype._updateStatistics(eventId, fireFlag,
							beginTime, endTime);
				}
				
			}
			// if it is null, return blank array to client as a success
			if (ret == null) ret=new Result();
			// change data to string and return it to client
			return JSON.stringify(ret);
		}
	}catch(e){
		var result=(new Result())
		.error("RuntimeErrorException", {"eventId":eventId,"message":e.message});
		var systemErrorUrl=EfwServerProperties.prototype.get("efw.system.error.url","");
		if (systemErrorUrl!=""){
			result.navigate(systemErrorUrl);
		}
		return JSON.stringify(result);
	}
};