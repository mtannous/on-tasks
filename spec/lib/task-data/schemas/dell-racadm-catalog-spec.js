// Copyright 2016, EMC, Inc.
/* jshint node: true */

'use strict';

describe(require('path').basename(__filename), function() {
    var schemaFileName = 'dell-racadm-catalog.json';

    var partialCanonical = {
        action: 'getConfigCatalog',
    };

    var positiveSetParam = {
        action: ["getConfigCatalog", "getSoftwareList"]
    };

    var negativeSetParam = {
        action: 'anything'
    };

    var positiveUnsetParam = [
    ];

    var negativeUnsetParam = [ 
        "action"
    ];

    var SchemaUtHelper = require('./schema-ut-helper');
    new SchemaUtHelper(schemaFileName, partialCanonical).batchTest(
        positiveSetParam, negativeSetParam, positiveUnsetParam, negativeUnsetParam);
});
