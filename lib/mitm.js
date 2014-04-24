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
        throw new Error("Cannot use an empty object");
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
    var stack = args[0],
        out = args[args.length-1];
    
    args = args.slice(1,-1);

    var index = 0;
    function next(err) {
        if (err) {

        }

        var fn = stack[index++];
        if (!fn) {
            return out.apply(this, args);
        }
        fn.apply(this, args.concat([next.bind(this)]));
    };

    next.call(this);
}

/**
 *
 *
 */

App.prototype.init = function(ready) {
    var self = this;
    MongoClient.connect(this.config.db, function(err, db) {
        if (err) {

        }

        self.db = db;
        self.documents = db.collection(self.config.collection);
        if (!self.documents) {

        }
        
        series.call(self, self.stacks.init, function(err) {
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
    series(self.stacks.find_before, query, function(query) {
        self.documents.find(query).toArray(function(err, items) {
            series(self.stacks.find_after, items, function(items) {
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
    series(self.stacks.update_before, id, entry, function(id, entry) {
        self.documents.update({_id: ObjectId(id)}, {$set: entry}, function(err, doc) {
            series(self.stacks.update_after, doc, function(doc) {
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
    series(this.stacks.insert_before, entry, function(entry) {
        this.documents.insert(entry, function(err, doc) {
            series(this.stacks.insert_after, doc, function(doc) {
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
    series(this.stacks.remove_before, id, function(id) {
        this.documents.remove({_id: ObjectId(id)}, function(err, res) {
            series(this.stacks.remove_after, res, function(res) {
                fn(err, res);
            });
        });
    });
}

module.exports = exports = App;

