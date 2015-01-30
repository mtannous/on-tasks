// Copyright 2015, Renasar Technologies Inc.
/* jshint node:true */

'use strict';

module.exports = {

    before: function (callback) {
        before(function () {
            callback(this);
        });
    },

    examples: function () {
        before(function () {
            expect(this.taskdefinition).to.be.ok;
            expect(this.taskdefinition).to.be.an.Object;
        });

        describe('expected properties', function() {

            it('should have a friendly name', function() {
                expect(this.taskdefinition).to.have.property('friendlyName');
                expect(this.taskdefinition.friendlyName).to.be.a('string');
            });

            it('should have an injectableName', function() {
                expect(this.taskdefinition).to.have.property('injectableName');
                expect(this.taskdefinition.injectableName).to.be.a('string');
            });

            it('should have a runJob', function() {
                expect(this.taskdefinition).to.have.property('runJob');
                expect(this.taskdefinition.runJob).to.be.a('string');
            });

            it('should have requiredOptions', function() {
                expect(this.taskdefinition).to.have.property('requiredOptions');
                expect(this.taskdefinition.requiredOptions).to.be.instanceof(Array);
            });

            it('should have properties', function() {
                expect(this.taskdefinition).to.have.property('properties');
                expect(this.taskdefinition.properties).to.be.an('Object');
            });

        });
    }
};