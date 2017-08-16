var express = require("express");
var app = express();
var cfenv = require("cfenv");
var bodyParser = require('body-parser');
var requestSrv = require('request');
var dateformatter = require('dateformat');

const today = dateformatter(new Date(), "yyyy-mm-dd");

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
app.use(bodyParser.json())

var annotatorService;

// user defined environment variable to test different ACD registered services
//var _tmpSrvName = process.env.SERVICE_NAME;
var _tmpSrvName = "advanced_annotated_data.dev";
var servicename = _tmpSrvName ? _tmpSrvName :'acd-default';

/**
 * Endpoint to get a JSON array of all the visitors in the database
 * REST API example:
 * <code>
 * GET http://localhost:3000/api/status
 * </code>
 *
 * Response:
 * {
 *  "version": "string",
 *  "upTime": "string",
 *  "serviceState": "OK",
 *  "stateDetails": "string",
 *  "hostName": "string",
 *  "requestCount": 0,
 *  "maxMemoryMb": 0,
 *  "commitedMemoryMb": 0,
 *  "inUseMemoryMb": 0,
 *  "availableProcessors": 0
 * }
 * @return A status object
 */
app.get("/api/status", function (request, response){
  console.log("calling /api/status");
  var status = {
    "version": "",
    "upTime": "",
    "serviceState": "",
    "stateDetails": "",
    "hostName": "",
    "requestCount": 0,
    "maxMemoryMb": 0,
    "commitedMemoryMb": 0,
    "inUseMemoryMb": 0,
    "availableProcessors": 0
  };
  if(!annotatorService){
    console.log("No annotator service information.")
    response.json(status);
    return;
  }
  var url = annotatorService.credentials.url +'/status';
  console.log("calling: " + url);
  requestSrv(url, function(error, res, body){
    if (!error && res.statusCode == 200){
      console.log(body);
      response.send(body);
    }else{
      console.log("Error while getting status");
      console.log(res && res.statusCode);
      console.log(body);
      response.send(status);
    }
  }).auth(annotatorService.credentials.username, annotatorService.credentials.password);
});

/**
 *
 * <code>
 * GET http://localhost:3000/api/analytics
 * </code>
 * {
 *  "annotatorNames": [
 *    "string"
 *  ]
 * }
 * @return a list of analytic ids that can be queried for capability metadata or sent data for processing
 */
app.get("/api/analytics", function(request, response){
  console.log("calling /api/analytics");
  var analytics = [];
  if(!annotatorService){
    console.log("No annotator service information.")
    response.json(analytics);
    return;
  }
  var url = annotatorService.credentials.url +'/analytics?version=' + today;
  console.log("calling: " + url);
  requestSrv(url, function(error, res, body){
    if (!error && res.statusCode == 200){
      console.log(body);
      response.send(body);
    }else{
      console.log("Error while getting analytics");
      console.log(res && res.statusCode);
      console.log(body);
      response.send(analytics);
    }
  }).auth(annotatorService.credentials.username, annotatorService.credentials.password);
});

app.post("/api/analytics/:analytic_id", function(request, response){
  console.log("calling /api/analytics/:analytic_id");

  var analytics = [];
  if(!annotatorService){
    console.log("No annotator service information.")
    response.json(analytics);
    return;
  }
  var uri = annotatorService.credentials.url +'/analytics/'+ request.params.analytic_id + '?viewer=true&version=' + today;
  console.log("calling: " + uri);
  var reqBody = '';
  request.on('readable', function() {
      var i = request.read();
        if (i)
          reqBody += i;
  });
  request.on('end', function() {
    console.log (reqBody);
    requestSrv.post({
        'headers':{
          "Accept": "application/json",
          "content-type": "text/plain"
        },
        'url': uri,
        'body': reqBody
    }, function(error, res, body){
        if (!error && res.statusCode == 200){
          response.send(body);
        }else{
          console.log("Error while analyzing text");
          console.log(res && res.statusCode);
          console.log(body);
          response.send(analytics);
        }
      }).auth(annotatorService.credentials.username, annotatorService.credentials.password);
  });
});


// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

if (appEnv.services[servicename]){
  var acd = appEnv.services[servicename][0];
  annotatorService = acd;
}else{
  console.log("No VCAP_SERVICES were found for: " + servicename + ". Check your user defined environment variable SERVICE_NAME.")
}

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));



var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
    console.log("Using acd service named: " + servicename);
});
