"use strict";
var VERBOSE = true;

// external imports
require('asynquence-contrib');
var ASQ = require('asynquence');
var express = require('express');
var body_parser = require('body-parser');

var app = express();
var json_parser = body_parser.json()

// routes
app.use(express.static(''));

app.listen(8081);
