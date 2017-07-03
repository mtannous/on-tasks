// Copyright 2015, EMC, Inc.

'use strict';

var uuid = require('node-uuid');
var base = require('./base-spec');


describe('Name Node Job', function () {
    var job,
        node = {
            id: '1234abcd1234abcd1234abcd'
        },
        snmpSettings = {
            config: {
                host: '1.2.3.4'
            }
        },
        mockWaterline = {
            nodes: {
                findByIdentifier: sinon.stub(),
                updateByIdentifier: sinon.stub()
            },
            catalogs: {
                findOne: sinon.stub()
            },
            ibms: {
                findByNode: sinon.stub()
            }
        },
        catalog = {
            data: {
                '_1_3_6_1_2_1_1_1_0': 'stuff'
            }
        };

    before(function () {
        helper.setupInjector([
                helper.require('/lib/jobs/update-node-name.js'),
                helper.require('/lib/jobs/base-job.js'),
                helper.di.simpleWrapper(mockWaterline, 'Services.Waterline')
        ]);

        this.Jobclass = helper.injector.get('Job.Snmp.Node.Update');
    });

    beforeEach(function () {
        job = new this.Jobclass(
                {},
                {
                    target: node.id,
                    graphId: uuid.v4()
                },
                uuid.v4()
        );
    });

    describe('Base', function () {
        base.examples();
    });

    it('should update the target node through waterline', function () {
        mockWaterline.catalogs.findOne.resolves(catalog);
        mockWaterline.nodes.findByIdentifier.resolves(node);
        mockWaterline.nodes.updateByIdentifier.resolves({});
        mockWaterline.ibms.findByNode.resolves(snmpSettings);

        job._run();
        return job._deferred
        .then(function () {
            expect(mockWaterline.nodes.updateByIdentifier)
            .to.have.been.calledWith(node.id, { name: 'stuff_1.2.3.4'});
        });
     });
});
