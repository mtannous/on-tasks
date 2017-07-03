// Copyright 2015, EMC, Inc.

'use strict';
var uuid = require('node-uuid');
describe('Validate Ssh', function() {
    var waterline = { lookups: {}, ibms: {} },
        encryption,
        ValidateSshJob,
        validateSshJob,
        Emitter = require('events').EventEmitter,
        users,
        lookups,
        sshSettings,
        mockSsh = new Emitter(),
        MockSsh = {};

    MockSsh.Client = function() {
        return mockSsh;
    };

    before(function() {
        helper.setupInjector([
            helper.require('/lib/jobs/validate-ssh.js'),
            helper.require('/lib/jobs/base-job.js'),
            helper.di.simpleWrapper(MockSsh, 'ssh'),
            helper.di.simpleWrapper(waterline, 'Services.Waterline')
        ]);

        this.sandbox = sinon.sandbox.create();
        ValidateSshJob = helper.injector.get('Job.Ssh.Validation');
        encryption = helper.injector.get('Services.Encryption');
        return encryption.start();
    });

    describe('_run', function() {

        beforeEach(function() {
            lookups = [
                {ipAddress: '1.1.1.1', macAddress: 'someMac'},
                {ipAddress: '2.2.2.2', macAddress: 'someMac'},
                {ipAddress: '3.3.3.3', macAddress: 'someMac'},
            ];
            sshSettings = {
                username: 'a username',
                password: 'a password',
                publicKey: 'a pretty long, publicKey string',
                privateKey: 'a pretty long, privateKey string'
            };
            users = [
                {name: 'someUser', password: 'somePassword'},
                {name: 'anotherUser', password: 'anotherPassword'},
                {name: 'aUser', password: 'aPassword'},
            ];
            validateSshJob = new ValidateSshJob({users: users}, {target: 'nodeId'}, uuid.v4());
            waterline.lookups.findByTerm = this.sandbox.stub().resolves(lookups);
            waterline.ibms.upsertByNode = this.sandbox.stub().resolves();
            this.sandbox.stub(validateSshJob, 'testCredentials').resolves(sshSettings);
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should use lookups to test ssh credentials and update a node with valid sshSettings',
        function() {
            sshSettings.host = 'testhost';

            return validateSshJob._run()
            .then(function() {
                expect(validateSshJob.testCredentials).to.be.calledOnce
                    .and.calledWithExactly(lookups, users, 2, 1000);
                expect(waterline.lookups.findByTerm).to.be.calledOnce
                    .and.calledWithExactly('nodeId');
                expect(waterline.ibms.upsertByNode).to.be.calledOnce
                    .and.calledWith('nodeId');

                var settings = waterline.ibms.upsertByNode.firstCall.args[1];
                expect(settings).to.have.property('config');
                settings = settings.config;

                expect(settings).to.have.property('host').that.equals(sshSettings.host);
                expect(settings).to.have.property('user').that.equals(sshSettings.username);
                expect(settings).to.have.property('password')
                    .that.not.equal(sshSettings.password);
                expect(settings).to.have.property('publicKey')
                    .that.not.equal(sshSettings.publicKey);
                expect(settings).to.have.property('privateKey')
                    .that.not.equal(sshSettings.privateKey);

                expect(encryption.decrypt(settings.password)).to.equal(sshSettings.password);
                expect(encryption.decrypt(settings.publicKey)).to.equal(sshSettings.publicKey);
                expect(encryption.decrypt(settings.privateKey)).to.equal(sshSettings.privateKey);
            });
        });

        it('should fail if credential tests fail', function() {
            var error = new Error('no connections');
            validateSshJob.testCredentials.rejects(error);
            this.sandbox.stub(validateSshJob, '_done').resolves();
            return validateSshJob._run()
            .then(function() {
                expect(validateSshJob._done).to.be.calledWith(error);
            });
        });

        it('should skip and succeed if no users are defined', function() {
            validateSshJob.users = null;
            this.sandbox.stub(validateSshJob, '_done').resolves();
            return validateSshJob._run()
            .then(function() {
                expect(validateSshJob._done).to.be.calledOnce;
                expect(validateSshJob._done).to.be.calledWith();
            });
        });
    });

    describe('attemptConnection', function() {

        beforeEach(function() {
            validateSshJob = new ValidateSshJob({users: users}, {target: 'nodeId'}, uuid.v4());
            mockSsh.end = this.sandbox.stub();
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should take an ip and user credentials and resolve a promise for valid sshSettings',
        function() {
            mockSsh.connect = function() {
                var self = this;
                setImmediate(function() {
                    self.emit('ready');
                });
            };
            return expect(
                validateSshJob.attemptConnection(
                    '1.2.3.4',
                    {name:'user', password: 'pass', sshKey: 'key'}
                )
            )
            .to.eventually.deep.equal({
                host: '1.2.3.4',
                user:'user',
                password: 'pass',
                publicKey: 'key',
                tryKeyboard: true
            });
        });

        it('should reject on error', function() {
            var error = new Error('auth methods failed');
            mockSsh.connect = function() {
                var self = this;
                setImmediate(function() {
                    self.emit('error', error);
                });
            };
            return expect(
                validateSshJob.attemptConnection(
                    '1.2.3.4',
                    {name:'user', password: 'pass', sshKey: 'key'}
                )
            ).to.be.rejectedWith(/auth methods failed/);
        });
    });

    describe('testCredentials', function() {

        beforeEach(function() {
            lookups = [
                {ipAddress: '1.1.1.1', macAddress: 'someMac'},
                {ipAddress: '2.2.2.2', macAddress: 'someMac'},
                {ipAddress: '3.3.3.3', macAddress: 'someMac'},
            ];

            users = [
                {name: 'someUser', password: 'somePassword'},
                {name: 'anotherUser', password: 'anotherPassword'},
                {name: 'aUser', password: 'aPassword'},
            ];

            validateSshJob = new ValidateSshJob({users: users}, {target: 'nodeId'}, uuid.v4());
            mockSsh.end = this.sandbox.stub();
            this.sandbox.stub(validateSshJob, 'attemptConnection').rejects(new Error('failed'));
        });

        afterEach(function() {
            this.sandbox.restore();
        });

        it('should test ssh for a set of lookup entry ip addresses and users', function() {
            validateSshJob.attemptConnection.onCall(9).resolves(
                {host: '3.3.3.3', username: 'aUser', password: 'aPassword'}
            );
            return validateSshJob.testCredentials(lookups, users, 2, 1)
            .then(function(out) {
                expect(out).to.deep.equal(
                    {host: '3.3.3.3', username: 'aUser', password: 'aPassword'}
                );
            });
        });

        it('should fail if after retries there are no successful connections', function() {
            return expect(validateSshJob.testCredentials(lookups, users, 2, 1))
                .to.be.rejected;
        });
    });
});
