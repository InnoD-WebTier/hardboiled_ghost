// # Issue Model
var _              = require('lodash'),
    uuid           = require('node-uuid'),
    Promise        = require('bluebird'),
    errors         = require('../errors'),
    ghostBookshelf = require('./base'),
    xmlrpc         = require('../xmlrpc'),
    storage        = require('../storage'),

    // HACK: to get unique YEAR on both MySQL and sqlite3
    mode = process.env.NODE_ENV === undefined ? 'development' : process.env.NODE_ENV,
    appRoot = path.resolve(__dirname, '../../../'),
    configFilePath = process.env.GHOST_CONFIG || path.join(appRoot, 'config.js'),
    configFile = require(configFilePath),
    appConfig = configFile[mode],

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
                findYear: ['year', 'status'],
                findPage: ['page', 'limit', 'status'],
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
        permittedAttributes.push('tags', 'articles');

        filteredData = _.pick(data, permittedAttributes);

        return filteredData;
    },

    buildWithRelated: function (include) {
      include = _.union(['tags', 'articles'], include);
      var buildOptions = {
        articles: function (qb) {
          qb.orderBy('article_num', 'ASC');
        },
      };

      return _.map(include, function(op) {
        if (buildOptions.hasOwnProperty(op)) {
          var qbOption = {};
          qbOption[op] = buildOptions[op];
          return qbOption;
        }
        return op;
      });
    },

    // ## Model Data Functions

    /**
     * #### findYear
     * Find results by year
     *
     * **response:**
     *
     *     {
     *         issues: [
     *         {...}, {...}, {...}
     *     ],
     *     year: __,
     *     years: __,
     *     }
     *
     * @param {Object} options
     */
    findYear: function (options) {
        options = options || {};

        var issueCollection = Issues.forge(),
            tagInstance = options.tag !== undefined ? ghostBookshelf.model('Tag').forge({slug: options.tag}) : false;

        var thisYear = new Date().getFullYear();
        if (options.year) {
            options.year = parseInt(options.year, 10) || thisYear;
        }

        options = this.filterOptions(options, 'findYear');

        // Set default settings for options
        options = _.extend({
            year: thisYear,
            where: {}
        }, options);

        // Unless `all` is passed as an option, filter on
        // the status provided.
        if (options.status !== 'all') {
            // make sure that status is valid
            options.status = _.indexOf(['published', 'draft'], options.status) !== -1 ? options.status : 'published';
            options.where.status = options.status;
        }

        // If there are where conditionals specified, add those
        // to the query.
        if (options.where) {
            issueCollection.query('where', options.where);
        }

        // Add related objects
        options.withRelated = this.buildWithRelated(options.include);

        // If a query param for a tag is attached
        // we need to fetch the tag model to find its id
        function fetchTagQuery() {
            if (tagInstance) {
                return tagInstance.fetch();
            }
            return false;
        }

        function yearRangeFromYear(year) {
          return [new Date(year, 0, 1), new Date(year + 1, 0, 1)]
        }

        return Promise.join(fetchTagQuery())

            // Set the limit & offset for the query, fetching
            // with the opts (to specify any eager relations, etc.)
            // Omitting the `page`, `limit`, `where` just to be sure
            // aren't used for other purposes.
            .then(function () {
                // If we have a tag instance we need to modify our query.
                // We need to ensure we only select issues that contain
                // the tag given in the query param.
                if (tagInstance) {
                    issueCollection
                        .query('join', 'issues_tags', 'issues_tags.issue_id', '=', 'issues.id')
                        .query('where', 'issues_tags.tag_id', '=', tagInstance.id);
                }

                return issueCollection
                    .query('whereBetween', 'published_at', yearRangeFromYear(options.year))
                    .query('orderBy', 'status', 'ASC')
                    .query('orderBy', 'published_at', 'DESC')
                    .query('orderBy', 'updated_at', 'DESC')
                    .fetch(_.omit(options, 'year'));
            })

            // Fetch year-inated information
            .then(function () {
                var qb,
                    tableName = _.result(issueCollection, 'tableName'),
                    idAttribute = _.result(issueCollection, 'idAttribute');

                // After we're done, we need to figure out what
                // the limits are for the pagination values.
                qb = ghostBookshelf.knex(tableName);
                var knex = ghostBookshelf.knex;

                // TODO: have to use different raw queries depending on database
                var yearQuery = (appConfig.database.client === 'sqlite3') ?
                    'SELECT DISTINCT strftime("%Y", published_at / 1000, "unixepoch") ' :
                    'SELECT DISTINCT FROM_UNIXTIME(`published_at` / 1000, "%Y") ';
                return knex.raw(yearQuery +
                                'FROM ' + tableName + ' ' +
                                'WHERE status = "published"');

                // if (options.where) {
                //     qb.where(options.where);
                // }
                //
                // if (tagInstance) {
                //     qb.join('issues_tags', 'issues_tags.issue_id', '=', 'issues.id');
                //     qb.where('issues_tags.tag_id', '=', tagInstance.id);
                // }
                //
                // return qb.distinct("date(published_at, 'start of year')");
                // return qb.raw('SELECT DISTINCT YEAR(published_at)');
                // .count(tableName + '.' + idAttribute + ' as aggregate');
            })

            // Format response of data
            .then(function (resp) {
                var publishYears = _.flatten(_.map(resp, _.values)),
                    meta = {},
                    data = {};

                // Pass include to each model so that toJSON works correctly
                if (options.include) {
                    _.each(issueCollection.models, function (item) {
                        item.include = options.include;
                    });
                }

                data.issues = issueCollection.toJSON();
                data.meta = meta;
                meta.publish_years = publishYears;

                if (tagInstance) {
                    meta.filters = {};
                    if (!tagInstance.isNew()) {
                        meta.filters.tags = [tagInstance.toJSON()];
                    }
                }

                return data;
            })
            .catch(errors.logAndThrowError);
    },

    /**
     * #### findPage
     * Find results by page - returns an object containing the
     * information about the request (page, limit), along with the
     * info needed for pagination (pages, total).
     *
     * **response:**
     *
     *     {
     *         issues: [
     *         {...}, {...}, {...}
     *     ],
     *     page: __,
     *     limit: __,
     *     pages: __,
     *     total: __
     *     }
     *
     * @param {Object} options
     */
    findPage: function (options) {
        options = options || {};

        var issueCollection = Issues.forge(),
            tagInstance = options.tag !== undefined ? ghostBookshelf.model('Tag').forge({slug: options.tag}) : false;

        if (options.limit) {
            options.limit = parseInt(options.limit, 10) || 15;
        }

        if (options.page) {
            options.page = parseInt(options.page, 10) || 1;
        }

        options = this.filterOptions(options, 'findPage');

        // Set default settings for options
        options = _.extend({
            page: 1, // pagination page
            limit: 15,
            status: 'published',
            where: {}
        }, options);

        // Unless `all` is passed as an option, filter on
        // the status provided.
        if (options.status !== 'all') {
            // make sure that status is valid
            options.status = _.indexOf(['published', 'draft'], options.status) !== -1 ? options.status : 'published';
            options.where.status = options.status;
        }

        // If there are where conditionals specified, add those
        // to the query.
        if (options.where) {
            issueCollection.query('where', options.where);
        }

        // Add related objects
        options.withRelated = this.buildWithRelated(options.include);

        // If a query param for a tag is attached
        // we need to fetch the tag model to find its id
        function fetchTagQuery() {
            if (tagInstance) {
                return tagInstance.fetch();
            }
            return false;
        }

        return Promise.join(fetchTagQuery())

            // Set the limit & offset for the query, fetching
            // with the opts (to specify any eager relations, etc.)
            // Omitting the `page`, `limit`, `where` just to be sure
            // aren't used for other purposes.
            .then(function () {
                // If we have a tag instance we need to modify our query.
                // We need to ensure we only select issues that contain
                // the tag given in the query param.
                if (tagInstance) {
                    issueCollection
                        .query('join', 'issues_tags', 'issues_tags.issue_id', '=', 'issues.id')
                        .query('where', 'issues_tags.tag_id', '=', tagInstance.id);
                }

                return issueCollection
                    .query('limit', options.limit)
                    .query('offset', options.limit * (options.page - 1))
                    .query('orderBy', 'status', 'ASC')
                    .query('orderBy', 'published_at', 'DESC')
                    .query('orderBy', 'updated_at', 'DESC')
                    .fetch(_.omit(options, 'page', 'limit'));
            })

            // Fetch pagination information
            .then(function () {
                var qb,
                    tableName = _.result(issueCollection, 'tableName'),
                    idAttribute = _.result(issueCollection, 'idAttribute');

                // After we're done, we need to figure out what
                // the limits are for the pagination values.
                qb = ghostBookshelf.knex(tableName);

                if (options.where) {
                    qb.where(options.where);
                }

                if (tagInstance) {
                    qb.join('issues_tags', 'issues_tags.issue_id', '=', 'issues.id');
                    qb.where('issues_tags.tag_id', '=', tagInstance.id);
                }

                return qb.count(tableName + '.' + idAttribute + ' as aggregate');
            })

            // Format response of data
            .then(function (resp) {
                var totalIssues = parseInt(resp[0].aggregate, 10),
                    calcPages = Math.ceil(totalIssues / options.limit),
                    pagination = {},
                    meta = {},
                    data = {};

                pagination.page = options.page;
                pagination.limit = options.limit;
                pagination.pages = calcPages === 0 ? 1 : calcPages;
                pagination.total = totalIssues;
                pagination.next = null;
                pagination.prev = null;

                // Pass include to each model so that toJSON works correctly
                if (options.include) {
                    _.each(issueCollection.models, function (item) {
                        item.include = options.include;
                    });
                }

                data.issues = issueCollection.toJSON();
                data.meta = meta;
                meta.pagination = pagination;

                if (pagination.pages > 1) {
                    if (pagination.page === 1) {
                        pagination.next = pagination.page + 1;
                    } else if (pagination.page === pagination.pages) {
                        pagination.prev = pagination.page - 1;
                    } else {
                        pagination.next = pagination.page + 1;
                        pagination.prev = pagination.page - 1;
                    }
                }

                if (tagInstance) {
                    meta.filters = {};
                    if (!tagInstance.isNew()) {
                        meta.filters.tags = [tagInstance.toJSON()];
                    }
                }

                return data;
            })
            .catch(errors.logAndThrowError);
    },

    /**
     * ### Find All
     *
     * @param {Object} options
     * @returns {*}
     */
    findAll:  function (options) {
        options = options || {};

        options.withRelated = this.buildWithRelated(options.include);
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

        options.withRelated = this.buildWithRelated(options.include);
        return ghostBookshelf.Model.findOne.call(this, data, options).then(function (issue) {
            return issue;
        });
    },

    /**
     * ### Edit
     * @extends ghostBookshelf.Model.edit to handle returning the full object and manage _updatedAttributes
     * **See:** [ghostBookshelf.Model.edit](base.js.html#edit)
     */
    edit: function (data, options) {
        var self = this,
            found;
        options = options || {};

        return self.findOne({
            status: 'all',
            id: options.id,
        }, _.extend(options, {
            include: ['tags', 'articles', 'articles.tags']
        })).then(function (result) {
            found = result;
            var updateArticles = [];
            if (found.attributes.status !== data.status) {
                // Update status of all containing articles
                var relatedArticles = found.related('articles').models;
                updateArticles = _.map(relatedArticles, function(article) {
                    var attr = article.attributes;
                    attr.status = data.status;
                    _.forEach(_.keys(article.relations), function(relation) {
                        attr[relation] = _.map(article.relations[relation].models, function (model) {
                            return model.attributes;
                        });
                    });
                    return ghostBookshelf.model('Article')
                        .edit(attr, {id: attr.id, context: options.context});
                });
            }
            return Promise.all(updateArticles);
        }).then(function() {
            return ghostBookshelf.Model.edit.call(self, data, options).then(function (issue) {
                return self.findOne({status: 'all', id: options.id}, options)
                    .then(function (newFound) {
                        // Pass along the updated attributes for checking status changes
                        newFound._updatedAttributes = issue._updatedAttributes;
                        return newFound;
                    });
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

        return this.forge({id: id}).fetch({withRelated: ['tags', 'articles']}).then(function destroyTagsAndIssue(issue) {
            return Promise.all(_.map(issue.related('articles').models, function (article) {
                return ghostBookshelf.model('Article').destroy({id: article.id, context: options.context});
            })).then(function() {
                return issue.related('tags').detach();
            }).then(function() {
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
