'use strict'

var expect = require('chai').expect,
    Mitm = require('../index'),
    mware = require('mitm-wares');

var config = {
    db: 'mongodb://localhost:27017/mongo-in-the-middle-tests',
    collection: 'testing'
};


suite('basic', function() {
    test('Basic object creation', function() {
        var app = new Mitm(config);
        expect(app).to.be.ok;
    });

    test('Insert, update, find and remove without middleware', function(done) {
        var app = new Mitm(config);
        app.init(function() {
            var entry = {hello: "World"};

            app.insert(entry, function(err, doc) {
                expect(!err).to.be.ok;
                expect(doc).to.have.length(1);
                expect(doc[0]._id).to.exist;

                app.findById(doc[0]._id, function(err, items) {
                    expect(items).to.have.length(1);

                    app.remove(doc[0]._id, function(err, res) {
                        expect(!err).to.be.ok;
                        expect(res).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    test('Insert, update, find and remove with middleware', function(done) {
        var app = new Mitm(config);
        expect(mware.sample).to.exist;
        app.use(mware.sample);

        app.init(function() {
            expect(app.testedInit).to.exist;

            var entry = {hello: "World"};
            app.insert(entry, function(err, doc) {
                expect(!err).to.be.ok;
                expect(doc[0]._id).to.exist;
                expect(app.testedInsertBefore).to.exist;
                expect(app.testedInsertAfter).to.exist;

                app.findById(doc[0]._id, function(err, items) {
                    expect(items).to.have.length(1);
                    expect(app.testedFindBefore).to.exist;
                    expect(app.testedFindAfter).to.exist;

                    app.remove(doc[0]._id, function(err, res) {
                        expect(!err).to.be.ok;
                        expect(res).to.equal(1);
                        expect(app.testedRemoveBefore).to.exist;
                        expect(app.testedRemoveAfter).to.exist;
                        done();
                    });
                });
            });
        });
    });

    test('Use some more sample middleware', function(done) {
        var app = new Mitm(config);
        app.use(mware.time);

        app.init(function() {
            var entry = {hello: "World"};

            app.insert(entry, function(err, doc) {
                expect(!err).to.be.ok;
                expect(doc[0]._id).to.exit;
                expect(doc[0].creationTime).to.exist;

                app.findById(doc[0]._id, function(err, items) {
                    expect(items.length).to.equal(1);

                    app.remove(doc[0]._id, function(err, res) {
                        expect(!err).to.be.ok;
                        done();
                    });
                });
            });
        });
    });

    test('Empty table', function(done) {
        var app = new Mitm(config);
        app.init(function() {
            app.find({}, function(err, items) {
                expect(items).to.have.length(0);
                app.documents.drop();
                app.db.close();
                app.db.dropDatabase(function(err, res) {
                    done();
                });
            });
        });
    });
});
