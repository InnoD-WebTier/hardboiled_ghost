// # Article Model
var _              = require('lodash'),
    uuid           = require('node-uuid'),
    Promise        = require('bluebird'),
    errors         = require('../errors'),
    Showdown       = require('showdown'),
    ghostgfm       = require('../../shared/lib/showdown/extensions/ghostgfm'),
    converter      = new Showdown.converter({extensions: [ghostgfm]}),
    ghostBookshelf = require('./base'),
    xmlrpc         = require('../xmlrpc'),

    Article,
    Articles;

Article = ghostBookshelf.Model.extend({

    tableName: 'articles',

    defaults: function () {
        return {
            uuid: uuid.v4(),
        };
    },

    initialize: function () {
        var self = this;

        ghostBookshelf.Model.prototype.initialize.apply(this, arguments);

        this.on('saved', function (model, attributes, options) {
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

        this.set('html', converter.makeHtml(this.get('markdown')));

        // disabling sanitization until we can implement a better version
        // this.set('title', this.sanitize('title').trim());
        this.set('title', this.get('title').trim());

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Article, this.get('slug') || this.get('title'),
                    {transacting: options.transacting})
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }
    },

    creating: function (newPage, attr, options) {
        /*jshint unused:false*/
        options = options || {};

        // set any dynamic default properties
        if (!this.get('author_id')) {
            this.set('author_id', this.contextUser(options));
        }

        ghostBookshelf.Model.prototype.creating.call(this, newPage, attr, options);
    },

   /**
     * ### updateTags
     * Update tags that are attached to a article.  Create any tags that don't already exist.
     * @param {Object} newArticle
     * @param {Object} attr
     * @param {Object} options
     * @return {Promise(ghostBookshelf.Models.Article)} Updated Article model
     */
    updateTags: function (newArticle, attr, options) {
        var self = this;
        options = options || {};

        if (!this.myTags) {
            return;
        }

        return Article.forge({id: newArticle.id}).fetch({withRelated: ['tags'], transacting: options.transacting}).then(function (article) {
            var tagOps = [];

            // remove all existing tags from the article
            // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
            // (https://github.com/tgriesser/bookshelf/issues/294)
            tagOps.push(article.tags().detach(null, _.omit(options, 'query')));

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

                // Create tags that don't exist and attach to article
                _.each(doNotExist, function (tag) {
                    createAndAttachOperation = ghostBookshelf.model('Tag').add({name: tag.name}, options).then(function (createdTag) {
                        createdTag = createdTag.toJSON();
                        // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
                        // (https://github.com/tgriesser/bookshelf/issues/294)
                        return article.tags().attach(createdTag.id, _.omit(options, 'query'));
                    });

                    tagOps.push(createAndAttachOperation);
                });

                // attach the tags that already existed
                _.each(existingTags, function (tag) {
                    // _.omit(options, 'query') is a fix for using bookshelf 0.6.8
                    // (https://github.com/tgriesser/bookshelf/issues/294)
                    tagOps.push(article.tags().attach(tag.id, _.omit(options, 'query')));
                });

                return Promise.all(tagOps);
            });
        });
    },

    // Relations
    issue_id: function () {
        return this.belongsTo('Issue', 'issue_id');
    },

    author_id: function () {
        return this.belongsTo('User', 'author_id');
    },

    created_by: function () {
        return this.belongsTo('User', 'created_by');
    },

    updated_by: function () {
        return this.belongsTo('User', 'updated_by');
    },

    tags: function () {
        return this.belongsToMany('Tag');
    },

    toJSON: function (options) {
        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        attrs.author = attrs.author || attrs.author_id;
        delete attrs.author_id;

        return attrs;
    }

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
                findPage: ['issue_id', 'page', 'limit', 'status', 'staticPages'],
                add: ['importing']
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

    /**
     * #### findPage
     * Find results by page - returns an object containing the
     * information about the request (page, limit), along with the
     * info needed for pagination (pages, total).
     *
     * **response:**
     *
     *     {
     *         articles: [
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

        var articleCollection = Articles.forge(),
            tagInstance = options.tag !== undefined ? ghostBookshelf.model('Tag').forge({slug: options.tag}) : false,
            authorInstance = options.author !== undefined ? ghostBookshelf.model('User').forge({slug: options.author}) : false,
            issueInstance = options.issue_id !== undefined ? ghostBookshelf.model('Issue').forge({id: options.issue_id}) : false;

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
            staticPages: false, // include static pages
            where: {}
        }, options);

        // TODO
        // if (options.staticPages !== 'all') {
        //     // convert string true/false to boolean
        //     if (!_.isBoolean(options.staticPages)) {
        //         options.staticPages = options.staticPages === 'true' || options.staticPages === '1' ? true : false;
        //     }
        //     options.where.page = options.staticPages;
        // }

        // TODO
        // // Unless `all` is passed as an option, filter on
        // // the status provided.
        // if (options.status !== 'all') {
        //     // make sure that status is valid
        //     options.status = _.indexOf(['published', 'draft'], options.status) !== -1 ? options.status : 'published';
        //     options.where.status = options.status;
        // }

        // If there are where conditionals specified, add those
        // to the query.
        if (options.where) {
            articleCollection.query('where', options.where);
        }

        // Add related objects
        options.withRelated = _.union(['tags'], options.include);

        // If a query param for a tag is attached
        // we need to fetch the tag model to find its id
        function fetchTagQuery() {
            if (tagInstance) {
                return tagInstance.fetch();
            }
            return false;
        }

        function fetchAuthorQuery() {
            if (authorInstance) {
                return authorInstance.fetch();
            }
            return false;
        }

        function fetchIssueQuery() {
            if (issueInstance) {
                return issueInstance.fetch();
            }
            return false;
        }

        return Promise.join(fetchTagQuery(), fetchAuthorQuery(), fetchIssueQuery())

            // Set the limit & offset for the query, fetching
            // with the opts (to specify any eager relations, etc.)
            // Omitting the `page`, `limit`, `where` just to be sure
            // aren't used for other purposes.
            .then(function () {
                // If we have a tag instance we need to modify our query.
                // We need to ensure we only select articles that contain
                // the tag given in the query param.
                if (tagInstance) {
                    articleCollection
                        .query('join', 'articles_tags', 'articles_tags.article_id', '=', 'articles.id')
                        .query('where', 'articles_tags.tag_id', '=', tagInstance.id);
                }

                if (authorInstance) {
                    articleCollection
                        .query('where', 'author_id', '=', authorInstance.id);
                }

                if (issueInstance) {
                    articleCollection
                        .query('where', 'issue_id', '=', issueInstance.id);
                }

                return articleCollection
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
                    tableName = _.result(articleCollection, 'tableName'),
                    idAttribute = _.result(articleCollection, 'idAttribute');

                // After we're done, we need to figure out what
                // the limits are for the pagination values.
                qb = ghostBookshelf.knex(tableName);

                if (options.where) {
                    qb.where(options.where);
                }

                if (tagInstance) {
                    qb.join('articles_tags', 'articles_tags.article_id', '=', 'articles.id');
                    qb.where('articles_tags.tag_id', '=', tagInstance.id);
                }
                if (authorInstance) {
                    qb.where('author_id', '=', authorInstance.id);
                }
                if (issueInstance) {
                    qb.where('issue_id', '=', issueInstance.id);
                }

                return qb.count(tableName + '.' + idAttribute + ' as aggregate');
            })

            // Format response of data
            .then(function (resp) {
                var totalArticles = parseInt(resp[0].aggregate, 10),
                    calcPages = Math.ceil(totalArticles / options.limit),
                    pagination = {},
                    meta = {},
                    data = {};

                pagination.page = options.page;
                pagination.limit = options.limit;
                pagination.pages = calcPages === 0 ? 1 : calcPages;
                pagination.total = totalArticles;
                pagination.next = null;
                pagination.prev = null;

                // Pass include to each model so that toJSON works correctly
                if (options.include) {
                    _.each(articleCollection.models, function (item) {
                        item.include = options.include;
                    });
                }

                data.articles = articleCollection.toJSON();
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

                if (authorInstance) {
                    meta.filters = {};
                    if (!authorInstance.isNew()) {
                        meta.filters.author = authorInstance.toJSON();
                    }
                }

                if (issueInstance) {
                    meta.filters = {};
                    if (!issueInstance.isNew()) {
                        meta.filters.issue = issueInstance.toJSON();
                    }
                }

                return data;
            })
            .catch(errors.logAndThrowError);
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
     * @extends ghostBookshelf.Model.findOne to handle article status
     * **See:** [ghostBookshelf.Model.findOne](base.js.html#Find%20One)
     */
    findOne: function (data, options) {
        options = options || {};

        // We don't need statuses for articles
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

        return ghostBookshelf.Model.edit.call(this, data, options).then(function (article) {
            return self.findOne({id: options.id}, options)
                .then(function (found) {
                    if (found) {
                        // Pass along the updated attributes for checking status changes
                        found._updatedAttributes = article._updatedAttributes;
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

        return ghostBookshelf.Model.add.call(this, data, options).then(function (article) {
            return self.findOne({id: article.id}, options);
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

        return this.forge({id: id}).fetch({withRelated: ['tags']}).then(function destroyTagsAndArticle(article) {
            return article.related('tags').detach().then(function () {
                return article.destroy(options);
            });
        });
    },

    // TODO: probably don't need this
    // /**
    //  * ### destroyByAuthor
    //  * @param  {[type]} options has context and id. Context is the user doing the destroy, id is the user to destroy
    //  */
    // destroyByAuthor: function (options) {
    //     var articleCollection = Articles.forge(),
    //         authorId = options.id;
    //
    //     options = this.filterOptions(options, 'destroyByAuthor');
    //     if (authorId) {
    //         return articleCollection.query('where', 'author_id', '=', authorId).fetch(options).then(function (results) {
    //             return Promise.map(results.models, function (article) {
    //                 return article.related('tags').detach(null, options).then(function () {
    //                     return article.destroy(options);
    //                 });
    //             });
    //         }, function (error) {
    //             return Promise.reject(new errors.InternalServerError(error.message || error));
    //         });
    //     }
    //     return Promise.reject(new errors.NotFoundError('No user found'));
    // },

    permissible: function (articleModelOrId, action, context, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            articleModel = articleModelOrId,
            origArgs;

        // If we passed in an id instead of a model, get the model
        // then check the permissions
        if (_.isNumber(articleModelOrId) || _.isString(articleModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);
            // Get the actual article model
            return this.findOne({id: articleModelOrId, status: 'all'}).then(function (foundArticleModel) {
                // Build up the original args but substitute with actual model
                var newArgs = [foundArticleModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            }, errors.logAndThrowError);
        }

        if (articleModel) {
            // If this is the author of the article, allow it.
            hasUserPermission = hasUserPermission || context.user === articleModel.get('author_id');
        }

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve();
        }

        return Promise.reject();
    }
});

Articles = ghostBookshelf.Collection.extend({
    model: Article
});

module.exports = {
    Article: ghostBookshelf.model('Article', Article),
    Articles: ghostBookshelf.collection('Articles', Articles)
};
