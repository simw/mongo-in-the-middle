'use strict'

var expect = require('chai').expect,
    Mitm = require('../index');

var config = {
    db: 'mongodb://localhost:27017/nbdb',
    collection: 'articles'
}; 

suite('basic', function() {
    test('Basic object creation', function() {
        var app = new Mitm(config);
        expect(app).to.be.ok;
    });

    test('Insert, find and remove', function() {
        var app = new Mitm(config);
        app.init(function() {
            var entry = {hello: "World"};

            app.insert(entry, function(err, doc) {
                expect(!err).to.be.ok;
                expect(doc._id).to.be.ok;

                app.find({_id: doc._id}, function(err, items) {
                    expect(items.length).to.equal(2);

                    app.remove(doc._id, function(err, res) {
                        expect(!err).to.be.ok;
                    });
                });
            });
        });
    });
});
