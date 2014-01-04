/*****************************************
    setup the database connection pool 
*/
var tedious = require('tedious');
var genericPool = require('generic-pool');
var fs = require("fs");

/*
    My config.json looks like:
{
    "server":"avatar.x5e.com", 
    "userName": "sa", 
    "password": "p@ssw0rd",
    "whitelist": "0-9A-z/+=-",
    "tester": "tester.html" 
}
*/
var config = JSON.parse(fs.readFileSync("config.json","utf8"));


function createConnection(finished) {
    var connection = new tedious.Connection(config);
    connection.on('debug', function(text) {
        //console.log("connection debug:",text);
      });
    connection.on('connect',function(err) {
        finished(err,connection)
    });
}

connectionPool = genericPool.Pool({
    name : "sqlserver",
    create : createConnection,
    destroy : function(connection) { connection.close(); },
    max : 10,
    idleTimeoutMillis : 60*1000,
    log : function(str,level) { if (level != "verbose") console.log(str) }
})


/**********************************************************
    declare how to transform posted data to sproc invocation
*/

sprocPattern = RegExp("^exsp_\\w*$");
stringArgPattern = RegExp("^[" + config.whitelist + "]*$");
paramPattern = RegExp("^\\w+$");
function valToSql(val) {
    if (val === null || val === undefined) {return "NULL";}
    if (val === true) {return "1";}
    if (val === false) {return "0";}
    if (typeof(val) === "number") {return val.toString();}
    if (typeof(val) === "string" && stringArgPattern.test(val)) {
        return "'" + val + "'"; }
    throw "valToSql: " + typeof(val) + " " + val.toString();
}
function bad(x,y) {
    throw y + " invalid input:" + (typeof(x)) + " " + x.toString() + "<=";
}

function jsonToSql(struct) {
    /* 
        converts a json struct like:
            ["exsp_foo",{"x":3,"y":"z"}]
        into a t-sql sproc execution statment like:
            "exec exsp_foo @x=3,@y='z';"
        Note that sproc names must start with exsp_ and string arguments
        may only come from a limited character set, intended to be only
        base64 encoded strings or strings that can be cast to a uuid.
    */
    if (struct.length != 2) {bad(struct,"A");}
    var sproc = struct[0].toString();
    if (! sprocPattern.test(sproc)){bad(sproc,"S");}
    var argsObj = struct[1];
    if (typeof(argsObj) != "object" ) {bad(argsO,"O");}
    var argsA = [ ];
    for (var key in argsObj) {
        if (!paramPattern.test(key)) {bad(key);}
        var pair = "@" + key + "=" + valToSql(argsObj[key]);
        argsA.push(pair); }
    return "exec " + sproc + " " + argsA.join() + ";" ;
}

/*
tester = ["exsp_foo",{"x":3,"y":"z"}];
//tester = ["exsp_foo",{"bla":"Ilikecheese"}];
console.log(jsonToSql(tester));
*/



/*************************************************
    code to take the sql and actually hit the db */

// onResult(err,result)
function hitDb(sql,onResult)
{
    return function (err,connection) {
      if (err) { return onResult(err); }
      var resultRows = [ ];
      request = new tedious.Request(sql, function(err, rowCount) {
        connectionPool.release(connection);
        if (err) onResult(err);
        else onResult(null,JSON.stringify(resultRows));
      });
    
      request.on('row', function(columns) {
        var thisRow = { };
        //console.log(columns);
        columns.forEach(function(column) {
            thisRow[column.metadata.colName] = column.value;
        });
        console.log(JSON.stringify(thisRow));
        resultRows.push(thisRow);
      });
      connection.execSql(request);
    }
}

/*******************************
    HTTP and integration code */


http = require("http");
querystring = require("querystring");


http.createServer(function (request, response) {
    function onDbResult(err,output) {
        if (err){
                console.log(err);
                response.writeHead(500);
                response.end("problems");
        } else {
            response.writeHead(200, {'Content-Type': 'application/json'}); 
            response.write(output);
            console.log("output:");
            console.log(output);
            response.end();
        }
    }
    if (request.method=="GET") 
    {
        fs.readFile(config["tester"],"utf8",function(err,data) {
            if (err) { 
                response.writeHead(500);
                response.end("couldn't read tester");
            } else {
                response.end(data);
            }
        });
    }
    else if (request.method=="POST") {
        var body = "";
        request.on("data",function(data) {body+=data;});   
        request.on("end",function() {
            try { 
                var ct = request.headers['content-type'];
                if (ct == 'application/x-www-form-urlencoded') {
                    var parsed = querystring.parse(body);
                    var what = parsed["what"];
                } else { what=body;}
                var sql = jsonToSql(JSON.parse(what)) 
            } 
            catch (err) { onDbResult(err); }
            connectionPool.acquire(hitDb(sql,onDbResult));
        })
    }
}).listen(3459);
console.log("listening on 3459")

