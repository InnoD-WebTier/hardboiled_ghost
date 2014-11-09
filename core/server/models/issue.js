// # Issue Model
var _              = require('lodash'),
    uuid           = require('node-uuid'),
    Promise        = require('bluebird'),
    errors         = require('../errors'),
    ghostBookshelf = require('./base'),
    xmlrpc         = require('../xmlrpc'),
    storage        = require('../storage'),

    Issue,
    Issues;

Issue = ghostBookshelf.Model.extend({

    tableName: 'issues',

    defaults: function () {
        return {
            uuid: uuid.v4(),
            status: 'draft'
        };
    },

    initialize: function () {
        var self = this;

        ghostBookshelf.Model.prototype.initialize.apply(this, arguments);

        this.on('saved', function (model, attributes, options) {
            if (model.get('status') === 'published') {
                xmlrpc.ping(model.attributes);
            }
            return self.updateTags(model, attributes, options);
        });
    },

    saving: function (newPage, attr, options) {
        /*jshint unused:false*/
        var self = this,
            tagsToCheck,
            i;

        options = options || {};
        // keep tags for 'saved' event and deduplicate upper/lowercase tags
        tagsToCheck = this.get('tags');
        this.myTags = [];

        _.each(tagsToCheck, function (item) {
            for (i = 0; i < self.myTags.length; i = i + 1) {
                if (self.myTags[i].name.toLocaleLowerCase() === item.name.toLocaleLowerCase()) {
                    return;
                }
            }

            self.myTags.push(item);
        });

        ghostBookshelf.Model.prototype.saving.call(this, newPage, attr, options);

        // disabling sanitization until we can implement a better version
        // this.set('title', this.sanitize('title').trim());
        this.set('title', this.get('title').trim());

        if ((this.hasChanged('status') || !this.get('published_at')) && this.get('status') === 'published') {
            if (!this.get('published_at')) {
                this.set('published_at', new Date());
            }
            // This will need to go elsewhere in the API layer.
            if (!this.get('published_by')) {
                this.set('published_by', this.contextUser(options));
            }
        }

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Issue, this.get('slug') || this.get('title'),
                    {status: 'all', transacting: options.transacting})
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }
    },

   /**
     * ### updateTags
     * Update tags that are attached to a issue.  Create any tags that don't already exist.
     * @param {Object} newIssue
     * @param {Object} attr
     * @param {Object} options
     * @return {Promise(ghostBookshelf.Models.Issue)} Updated Issue model
     */
    updateTags: function (newIssue, attr, options) {
        var self = this;
        options = options || {};

        if (!this.myTags) {
            return;
        }

        return Issue.forge({id: newIssue.id}).fetch({withRelated: ['tags'], transacting: options.transacting}).then(function (issue) {
            var tagOps = [];

            // remove all existing tags from the issue
            // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
            // (https://github.com/tgriesser/bookshelf/issues/294)
            tagOps.push(issue.tags().detach(null, _.omit(options, 'query')));

            if (_.isEmpty(self.myTags)) {
                return Promise.all(tagOps);
            }

            return ghostBookshelf.collection('Tags').forge().query('whereIn', 'name', _.pluck(self.myTags, 'name')).fetch(options).then(function (existingTags) {
                var doNotExist = [],
                    createAndAttachOperation;

                existingTags = existingTags.toJSON();

                doNotExist = _.reject(self.myTags, function (tag) {
                    return _.any(existingTags, function (existingTag) {
                        return existingTag.name === tag.name;
                    });
                });

                // Create tags that don't exist and attach to issue
                _.each(doNotExist, function (tag) {
                    createAndAttachOperation = ghostBookshelf.model('Tag').add({name: tag.name}, options).then(function (createdTag) {
                        createdTag = createdTag.toJSON();
                        // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
                        // (https://github.com/tgriesser/bookshelf/issues/294)
                        return issue.tags().attach(createdTag.id, _.omit(options, 'query'));
                    });

                    tagOps.push(createAndAttachOperation);
                });

                // attach the tags that already existed
                _.each(existingTags, function (tag) {
                    // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
                    // (https://github.com/tgriesser/bookshelf/issues/294)
                    tagOps.push(issue.tags().attach(tag.id, _.omit(options, 'query')));
                });

                return Promise.all(tagOps);
            });
        });
    },

    // Relations
    articles: function () {
        return this.hasMany('Articles', 'issue_id');
    },

    created_by: function () {
        return this.belongsTo('User', 'created_by');
    },

    updated_by: function () {
        return this.belongsTo('User', 'updated_by');
    },

    published_by: function () {
        return this.belongsTo('User', 'published_by');
    },

    tags: function () {
        return this.belongsToMany('Tag');
    },

//     fields: function () {
//         return this.morphMany('AppField', 'relatable');
//     },

}, {

    /**
    * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
    * @param {String} methodName The name of the method to check valid options for.
    * @return {Array} Keys allowed in the `options` hash of the model's method.
    */
    permittedOptions: function (methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findAll: ['withRelated'],
                findOne: ['importing', 'withRelated'],
                findPage: ['page', 'limit', 'status', 'staticPages'],
                add: ['importing'],
                destroy: ['pdf']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    /**
     * Filters potentially unsafe model attributes, so you can pass them to Bookshelf / Knex.
     * @param {Object} data Has keys representing the model's attributes/fields in the database.
     * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
     */
    filterData: function (data) {
        var permittedAttributes = this.prototype.permittedAttributes(),
            filteredData;

        // manually add 'tags' attribute since it's not in the schema
        permittedAttributes.push('tags');

        filteredData = _.pick(data, permittedAttributes);

        return filteredData;
    },

    // ## Model Data Functions

    /**
     * ### Find All
     *
     * @param {Object} options
     * @returns {*}
     */
    findAll:  function (options) {
        options = options || {};
        options.withRelated = _.union(['tags'], options.include);
        return ghostBookshelf.Model.findAll.call(this, options);
    },

    /**
     * ### Find One
     * @extends ghostBookshelf.Model.findOne to handle issue status
     * **See:** [ghostBookshelf.Model.findOne](base.js.html#Find%20One)
     */
    findOne: function (data, options) {
        options = options || {};

        // TODO
        // data = _.extend({
        //     status: 'published'
        // }, data || {});
        //
        // if (data.status === 'all') {
        //     delete data.status;
        // }
        delete data.status;

        // Add related objects
        options.withRelated = _.union(['tags'], options.include);

        return ghostBookshelf.Model.findOne.call(this, data, options);
    },

    /**
     * ### Edit
     * @extends ghostBookshelf.Model.edit to handle returning the full object and manage _updatedAttributes
     * **See:** [ghostBookshelf.Model.edit](base.js.html#edit)
     */
    edit: function (data, options) {
        var self = this;
        options = options || {};

        return ghostBookshelf.Model.edit.call(this, data, options).then(function (issue) {
            return self.findOne({status: 'all', id: options.id}, options)
                .then(function (found) {
                    if (found) {
                        // Pass along the updated attributes for checking status changes
                        found._updatedAttributes = issue._updatedAttributes;
                        return found;
                    }
                });
        });
    },

    /**
     * ### Add
     * @extends ghostBookshelf.Model.add to handle returning the full object
     * **See:** [ghostBookshelf.Model.add](base.js.html#add)
     */
    add: function (data, options) {
        var self = this;
        options = options || {};

        return ghostBookshelf.Model.add.call(this, data, options).then(function (issue) {
            return self.findOne({status: 'all', id: issue.id}, options);
        });
    },

    /**
     * ### Destroy
     * @extends ghostBookshelf.Model.destroy to clean up tag relations
     * **See:** [ghostBookshelf.Model.destroy](base.js.html#destroy)
     */
    destroy: function (options) {
        var id = options.id;
        options = this.filterOptions(options, 'destroy');

        var store = storage.getStorage(),
            pdfPath = options.pdf;

        return this.forge({id: id}).fetch({withRelated: ['tags']}).then(function destroyTagsAndIssue(issue) {
            return issue.related('tags').detach().then(function () {
                return issue.destroy(options);
            }).then(function () {
                return store.deletePdf(pdfPath);
            });
        });
    },

    permissible: function (issueModelOrId, action, context, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            issueModel = issueModelOrId,
            origArgs;

        // If we passed in an id instead of a model, get the model
        // then check the permissions
        if (_.isNumber(issueModelOrId) || _.isString(issueModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);
            // Get the actual issue model
            return this.findOne({id: issueModelOrId, status: 'all'}).then(function (foundIssueModel) {
                // Build up the original args but substitute with actual model
                var newArgs = [foundIssueModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            }, errors.logAndThrowError);
        }

        if (issueModel) {
            // If this is the author of the issue, allow it.
            hasUserPermission = hasUserPermission || context.user === issueModel.get('author_id');
        }

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve();
        }

        return Promise.reject();
    }
});

Issues = ghostBookshelf.Collection.extend({
    model: Issue
});

module.exports = {
    Issue: ghostBookshelf.model('Issue', Issue),
    Issues: ghostBookshelf.collection('Issues', Issues)
};
