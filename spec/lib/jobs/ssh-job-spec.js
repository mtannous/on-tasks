// Copyright 2016, EMC, Inc.

'use strict';
var uuid = require('node-uuid');

describe('ssh-job', function() {
    var waterline = { ibms: {}, catalogs: {} },
        mockParser = {},
        SshJob,
        sshJob;

    var commandUtil = {};
    function CommandUtil() { return commandUtil; }


    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/ssh-job.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(CommandUtil, 'JobUtils.Commands'),
            helper.di.simpleWrapper(mockParser, 'JobUtils.CommandParser'),
            helper.di.simpleWrapper({Client:function(){}}, 'ssh'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);
        this.sandbox = sinon.sandbox.create();
        SshJob = helper.injector.get('Job.Ssh');
    });

    describe('_run', function() {
        var sshSettings,
            testCommands;

        before(function() {
            testCommands = [
                {cmd: 'aCommand', source: 'test'},
                {cmd: 'testCommand'}
            ];
            commandUtil.buildCommands = this.sandbox.stub().returns(testCommands);
            sshJob = new SshJob({}, { target: 'someNodeId' }, uuid.v4());
            waterline.ibms.findByNode = this.sandbox.stub();
            commandUtil.sshExec = this.sandbox.stub().resolves();
            mockParser.parseTasks = this.sandbox.stub().resolves();
            mockParser.parseUnknownTasks = this.sandbox.stub().resolves();
            sshSettings = {
                config: {
                    host: 'the remote host',
                    port: 22,
                    username: 'someUsername',
                    password: 'somePassword',
                    privateKey: 'a pretty long string'
                }
            };

            expect(sshJob).to.have.property('commandUtil');
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should execute the given remote commands using credentials'+
        ' from a node and handle the responses', function() {
            commandUtil.parseResponse = this.sandbox.stub().resolves([
                    {data:'data', source: 'aCommand'},
                    {data:'more data', source: 'testCommand'}
            ]);
            commandUtil.catalogParsedTasks = this.sandbox.stub().resolves(
            [{data:'data', source: 'test'}]
            );
            commandUtil.updateLookups = this.sandbox.stub().resolves();

            waterline.ibms.findByNode.resolves(sshSettings);
            commandUtil.sshExec.onCall(0).resolves({stdout: 'data', cmd: 'aCommand'});
            commandUtil.sshExec.onCall(1).resolves({stdout: 'more data', cmd: 'testCommand'});
            sshJob.commands = testCommands;

            return sshJob._run()
            .then(function() {
                expect(commandUtil.sshExec).to.have.been.calledTwice
                    .and.calledWith(sshJob.commands[0], sshSettings.config)
                    .and.calledWith(sshJob.commands[1], sshSettings.config);
                expect(commandUtil.parseResponse).to.have.been.calledOnce
                    .and.calledWith([
                        {stdout: 'data', cmd: 'aCommand'},
                        {stdout: 'more data', cmd: 'testCommand'}
                    ]);
                expect(commandUtil.catalogParsedTasks).to.have.been.calledOnce
                    .and.calledWith(
                        {data: 'data', source: 'aCommand'},
                        {data: 'more data', source: 'testCommand'}
                    );
            });
        });
    });
});
