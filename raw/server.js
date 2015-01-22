#!/usr/bin/node
var pg = require('pg');
var fs = require("fs");
var http = require("http");
var querystring = require("querystring");

if (process.argv.length < 3) {
    console.log("pass in config file location");
    process.exit(1);
}
loc = process.argv[2]

/*
My config.json looks like:
{
    "conString": "postgres://darin:5432@localhost/db_channels"
}
*/
var config = JSON.parse(fs.readFileSync(loc,"utf8"));

console.log(config)


stringArgPattern = RegExp("^[0-9A-z/+=-]*$");
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

/*******************************
    HTTP and integration code */

http.createServer(function (request, response) {
    function onDbResult(err,output) {
        if (err){
                console.log(err);
                response.writeHead(500);
                response.end("problems");
        } else {
            response.writeHead(200, {'Content-Type': 'application/json'}); 
            //console.log("output:");
            //console.log(output);
            response.write(JSON.stringify(output.rows));
            response.end();
        }
    }
    if (request.method=="GET") 
    {
        fs.readFile("tester.html","utf8",function(err,data) {
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
            var query = "";
            try { 
                var ct = request.headers['content-type'];
                if (ct == 'application/x-www-form-urlencoded') {
                    var parsed = querystring.parse(body);
                    var query = parsed["query"];
                } else { query=body;}
                console.log(query);
            } 
            catch (err) { 
                onDbResult(err); 
                return;
            }
            pg.connect(config["conString"],function(err,client,done) {
                if (err){
                    console.log(err);
                    response.writeHead(500);
                    response.end("db problems");
                } else {
                    client.query(query,onDbResult);
                    done();
                }
            });
        })
    }
}).listen(4444);
console.log("listening on 4444")

