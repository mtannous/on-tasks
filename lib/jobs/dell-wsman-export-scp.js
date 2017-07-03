// Copyright 2017, DELL, Inc.

'used strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = DellWsmanExportSCPJobFactory;
di.annotate(DellWsmanExportSCPJobFactory, new di.Provide('Job.Dell.Wsman.Export.SCP'));
di.annotate(DellWsmanExportSCPJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Configuration',
    '_',
    'HttpTool',
    'Errors',
    'Services.Encryption',
    'validator'
));

function DellWsmanExportSCPJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    configuration,
    _,
    HttpTool,
    errors,
    encryption,
    validator
) {
    var logger = Logger.initialize(DellWsmanExportSCPJobFactory);

    function DellWsmanExportSCPJob(options, context, taskId) {
        DellWsmanExportSCPJob.super_.call(this, logger, options, context, taskId);
        assert.object(this.options);
        this.nodeId = this.context.target;
    }

    util.inherits(DellWsmanExportSCPJob, BaseJob);

    DellWsmanExportSCPJob.prototype._run = function () {
        var self = this;
        self.dell = configuration.get('dell');

        if (!self.dell || !self.dell.services || !self.dell.services.configuration) {
            throw new errors.NotFoundError('Dell SCP Export web service is not defined in wsmanConfig.json.');
        }
        return Promise.resolve(self.checkOBM())
            .then(function(obm){
                return self.exportSCP(obm);
            })
            .then(function(){
                return self._done();
            })
            .catch(function(err) {
                self._done(err);
            });
    };

    DellWsmanExportSCPJob.prototype.checkOBM = function() {
        var self = this;
        logger.info('checkOBM: Self.nodeID: ' + self.nodeId);
        return waterline.nodes.findByIdentifier(self.nodeId)
            .then(function(result) {
                self.nodeType = result.type;
                if (self.nodeType !== 'compute') {
                    logger.info('SCP Export is not applicable to node type ' + self.nodeType);
                    self.cancel();
                    return;
                }
                return waterline.obms.findByNode(self.nodeId, 'dell-wsman-obm-service', true)
            }).then(function(obm) {
                if (!obm) {
                    throw new errors.NotFoundError('Cannot find WSMAN OBM settings');
                }
                return obm;
            })
    };

    DellWsmanExportSCPJob.prototype.exportSCP = function(obm) {

        if (!validator.isIP(this.options.serverIP) || !validator.isIP(this.options.shareAddress)) {
            throw new Error('Invalid ServerIP/ShareAddress');
        }

        var self = this;
        var gateway = self.dell.gateway;
        var parse = urlParse(gateway);

        var setups = {};

        setups.url = {};
        setups.url.protocol = parse.protocol.replace(':','').trim();
        setups.url.host = parse.host.split(':')[0];
        setups.url.port = parse.port;
        setups.url.path = self.dell.services.configuration.export || '/';

        setups.method = "POST";
        setups.credential = {};
        setups.verifySSl = false;
        setups.headers = {'Content-Type': 'application/json'};
        setups.recvTimeoutMs = 60000;

        this.options.serverUsername = obm.config.userName;
        this.options.serverPassword = encryption.decrypt(obm.config.password);

        setups.data = this.options;

        var http = new HttpTool();

        return http.setupRequest(setups)
            .then(function(){
                return http.runRequest();
            }).then(function(response) {
                logger.info('Response from SCP Export Microservice: ' + response.body);
                var json = JSON.parse(response.body);
                logger.info('Status from SCP Microservice for Export System Configuration:  ' + json["status"]);
                if(json["status"]=="OK") {
                    return response;
                } else {
                    throw new errors.InternalServerError(json["message"]);
                }
            });

    }

    return DellWsmanExportSCPJob;
}
