'use strict'

var mongo = require('mongodb');

var MongoClient = mongo.MongoClient,
    ObjectId = mongo.ObjectID;

/**
 *
 *
 */

var App = function(config) {
    if (!config.db || !config.collection) {
        throw new Error('Must supply config.db and config.collection');
    }

    this.config = {};
    this.config.db = config.db;
    this.config.collection = config.collection;

    var contexts = ['init', 'find_before', 'find_after',
        'insert_before', 'insert_after', 'update_before', 'update_after',
        'remove_before', 'remove_after'];

    this.stacks = {};
    var self = this;
    contexts.forEach(function(item) {
        self.stacks[item] = [];
    });
}


/**
 *
 *
 */

App.prototype.use = function(obj) {
    if (!obj) {
        throw new Error("Mongo-in-the-middle: Falsey object passed into use function");
    }

    if (obj.init) {
        if (typeof obj.init != 'function') {

        }
        this.stacks.init.push(obj.init);
    }
    
    if (obj.find) {
        if (obj.find.before) this.stacks.find_before.push(obj.find.before);
        if (obj.find.after) this.stacks.find_after.push(obj.find.after);
    }

    if (obj.update) {
        if (obj.update.before) this.stacks.update_before.push(obj.update.before);
        if (obj.update.after) this.stacks.update_after.push(obj.update.after);
    }

    if (obj.insert) {
        if (obj.insert.before) this.stacks.insert_before.push(obj.insert.before);
        if (obj.insert.after) this.stacks.insert_after.push(obj.insert.after);
    }

    if (obj.remove) {
        if (obj.remove.before) this.stacks.remove_before.push(obj.remove.before);
        if (obj.remove.after) this.stacks.remove_after.push(obj.remove.after);
    }

    return this; 
}

/**
 *
 *
 */

function addToStack(stack, fn) {

}

/**
 *
 *
 */

function series() {
    var args = Array.prototype.slice.call(arguments);
    var self = args[0], stack = args[1],
        out = args[args.length-1];
    
    args = args.slice(2,-1);

    var index = 0;
    function next(err) {
        if (err) {

        }

        var fn = stack[index++];
        if (!fn) {
            return out.apply(self, args);
        }
        fn.apply(self, args.concat([next.bind(self)]));
    };

    next.call(self);
}

/**
 *
 *
 */

App.prototype.init = function(ready) {
    var self = this;
    self.MongoClient = MongoClient;
    MongoClient.connect(this.config.db, function(err, db) {
        if (err) {
            throw new Error("Mongo-in-the-middle: Error connecting to db, " + err);
        }

        self.db = db;
        self.documents = db.collection(self.config.collection);
        if (!self.documents) {

        }
        
        series(self, self.stacks.init, function(err) {
            if (err) {

            }

            ready();
        });
    });
}


/**
 *
 *
 */

App.prototype.find = function(query, fn) {
    var self = this;
    series(self, self.stacks.find_before, query, function(query) {
        self.documents.find(query).toArray(function(err, items) {
            series(self, self.stacks.find_after, items, function(items) {
                fn(err, items);
            });
        });
    });
}

/**
 *
 *
 */

App.prototype.findById = function(id, fn) {
    var query = {_id: ObjectId(id)};
    this.find(query, fn); 
}

/**
 *
 *
 */

App.prototype.update = function(id, entry, fn) {
    var self = this;
    if (entry._id) delete entry._id;
    series(self, self.stacks.update_before, id, entry, function(id, entry) {
        self.documents.update({_id: ObjectId(id)}, {$set: entry}, function(err, doc) {
            series(self, self.stacks.update_after, doc, function(doc) {
                fn(err, doc);
            });
        });
    });    
}

/**
 *
 *
 */

App.prototype.insert = function(entry, fn) {
    var self = this;
    series(self, self.stacks.insert_before, entry, function(entry) {
        self.documents.insert(entry, function(err, doc) {
            series(self, self.stacks.insert_after, doc, function(doc) {
                fn(err, doc);
            });
        });
    });
}

/**
 *
 *
 */

App.prototype.remove = function(id, fn) {
    var self = this;
    series(self, self.stacks.remove_before, id, function(id) {
        self.documents.remove({_id: ObjectId(id)}, function(err, res) {
            series(self, self.stacks.remove_after, res, function(res) {
                fn(err, res);
            });
        });
    });
}

module.exports = exports = App;

