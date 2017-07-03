// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = nodeAlertJobFactory;
di.annotate(nodeAlertJobFactory, new di.Provide('Job.Alert.Node.Discovered'));
di.annotate(nodeAlertJobFactory, new di.Inject(
    'Protocol.Events',
    'Job.Base',
    'Logger',
    'Util',
    'Services.Waterline',
    'Services.Lookup',
    'Assert'
));
function nodeAlertJobFactory(
    eventsProtocol,
    BaseJob,
    Logger,
    util,
    waterline,
    lookup,
    assert
) {
    var logger = Logger.initialize(nodeAlertJobFactory);

    /**
     * @param {Object} options
     * @param {Object} context
     * @param {String} taskId
     * @constructor
     */
    function NodeAlertJob(options, context, taskId) {
        NodeAlertJob.super_.call(this, logger, options, context, taskId);

        this.logger = logger;
        this.nodeId = context.target;
    }
    util.inherits(NodeAlertJob, BaseJob);

    /**
     * @memberOf NodeAlertJob
     */
    NodeAlertJob.prototype._run = function run() {
        var self = this;
        return waterline.nodes.needByIdentifier(self.nodeId)
        .then(function(node) {
            assert.string(node.type);
            return lookup.findIpMacAddresses(self.nodeId)
            .then(function(ipMacPairs) {
                var nodeInfo = {};
                nodeInfo.ipMacAddresses = ipMacPairs;
                nodeInfo.nodeId = self.nodeId;
                if(self.context.data){
                    nodeInfo = _.defaults(
                        nodeInfo,
                        self.context.data
                    );
                }
                return eventsProtocol.publishNodeEvent(node, 'discovered', nodeInfo);
            });

        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };

    return NodeAlertJob;
}
