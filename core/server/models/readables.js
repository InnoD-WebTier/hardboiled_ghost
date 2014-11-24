// # Readable Model
var _              = require('lodash'),
    uuid           = require('node-uuid'),
    Promise        = require('bluebird'),
    errors         = require('../errors'),
    Showdown       = require('showdown'),
    ghostgfm       = require('../../shared/lib/showdown/extensions/ghostgfm'),
    converter      = new Showdown.converter({extensions: [ghostgfm]}),
    ghostBookshelf = require('./base'),
    xmlrpc         = require('../xmlrpc'),
    path           = require('path'),
    fs             = require('fs-extra'),
    storage        = require('../storage'),

    Readable,
    Readables;

Readable = ghostBookshelf.Model.extend({}, {

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
                findPage: ['page', 'limit', 'status'],
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
     * #### findPageByAuthor
     *
     * **response:**
     *
     *     {
     *         readables: [
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
    findPageByAuthor: function (options) {
        if (!options.author) {
            return;
        }

        debugger;
        var authorInstance = ghostBookshelf.model('User').forge({slug: options.author}),
            readablesResponse;

        if (options.limit) {
            options.limit = parseInt(options.limit, 10) || 15;
        }

        if (options.page) {
            options.page = parseInt(options.page, 10) || 1;
        }

        // Set default settings for options
        options = _.extend({
            page: 1, // pagination page
            limit: 15,
            status: 'published'
        }, options);

        var knex = ghostBookshelf.knex,
            columns = [
                'title',
                'slug',
                'image',
                'published_at',
                'updated_at',
                'html',
                'series'
            ],

            // hacky way to get types from readables
            uniqueColumns = {
                'featured':       'post',
                'article_num':    'article',
            },

            all_cols = _.union(columns, _.keys(uniqueColumns)),

            _post        = ghostBookshelf.model('Post').forge(),
            postTable    = _post.tableName,
            postId       = postTable + "." + _post.idAttribute,
            postWhere    = _.zipObject([postTable + '.status'], ['published']),

            _article     = ghostBookshelf.model('Article').forge(),
            articleTable = _article.tableName,
            articleId    = articleTable + "." + _article.idAttribute,
            articleWhere = {};

        return authorInstance.fetch().then(function() {
            // If we have a tag instance we need to modify our query.
            // We need to ensure we only select readables that contain
            // the tag given in the query param.

            var q = knex.select(all_cols) // posts
                .from(postTable)
                .where(_.extend(postWhere, {
                    'author_id': authorInstance.id,
                }))
                .unionAll(function () {
                    this.select(all_cols) // articles
                        .from(articleTable)
                        .where(_.extend(articleWhere, {
                            'author_id': authorInstance.id
                        }));
                })
                .limit(options.limit)
                .offset(options.limit * (options.page - 1))
                .orderBy('published_at', 'DESC')
                .orderBy('updated_at', 'DESC');

            return q;
        })

        // Fetch pagination information
        .then(function (resp) {
            function typeForUniqueColumn(key, val) {
                if (!_.contains(_.keys(uniqueColumns), key)) {
                    return false;
                }
                if (key === val) {
                    return false;
                }
                return uniqueColumns[key];
            }

            readablesResponse = _.map(resp, function(r) {
                // FIXME: hacky way to mimick regular calls to API
                var clean = _.transform(r, function(result, val, key) {
                    delete result[key]

                    var fixedKey = key.slice(1, -1);

                    // assign type
                    var type = typeForUniqueColumn(fixedKey, val);
                    if (type) {
                        result.type = type;
                        return;
                    }

                    // fix remaining keys
                    if (fixedKey === val) {
                        return;
                    }
                    result[fixedKey] = val;
                });
                clean['author'] = authorInstance;
                return clean;
            });

            promises = [];
            _.forEach(readablesResponse, function(r) {
                _.forOwn(r, function(val) {
                    if (val && typeof val.then === 'function') {
                        promises.push(val);
                    }
                });
            });

            return Promise.all(promises);
        }).then(function () {

            var q = knex.select('temp.id').from(function () {
                this.select(postId) // posts
                    .from(postTable)
                    .where(_.extend(postWhere, {
                        'author_id': authorInstance.id,
                    }))
                    .unionAll(function () {
                        this.select(articleId) // articles
                            .from(articleTable)
                            .where(_.extend(articleWhere, {
                                'author_id': authorInstance.id
                            }));
                    }).as('temp');
            }).count('id as aggregate');

            return q;
        })

        // Format response of data
        .then(function (resp) {
            var totalReadables = parseInt(resp[0].aggregate, 10),
                calcPages = Math.ceil(totalReadables / options.limit),
                pagination = {},
                meta = {},
                data = {};

            pagination.page = options.page;
            pagination.limit = options.limit;
            pagination.pages = calcPages === 0 ? 1 : calcPages;
            pagination.total = totalReadables;
            pagination.next = null;
            pagination.prev = null;

            // Pass include to each model so that toJSON works correctly
            if (options.include) {
                _.each(readableCollection.models, function (item) {
                    item.include = options.include;
                });
            }

            data.readables = readablesResponse;
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

            meta.filters = {};
            if (!authorInstance.isNew()) {
                meta.filters.author = authorInstance.toJSON();
            }

            debugger;
            return data;
        })
        .catch(errors.logAndThrowError);
    },

    /**
     * #### findPageByTag
     *
     * **response:**
     *
     *     {
     *         readables: [
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
    findPageByTag: function (options) {
        if (!options.tag) {
            return;
        }

        var tagInstance = ghostBookshelf.model('Tag').forge({slug: options.tag}),
            readablesResponse;

        if (options.limit) {
            options.limit = parseInt(options.limit, 10) || 15;
        }

        if (options.page) {
            options.page = parseInt(options.page, 10) || 1;
        }

        // Set default settings for options
        options = _.extend({
            page: 1, // pagination page
            limit: 15,
            status: 'published'
        }, options);

        var knex = ghostBookshelf.knex,
            columns = [
                'title',
                'slug',
                'image',
                'author_id as author',
                'published_at',
                'updated_at',
                'html',
                'series'
            ],

            // hacky way to get types from readables
            uniqueColumns = {
                'featured':       'post',
                'article_length': 'issue',
                'article_num':    'article',
            },

            all_cols = _.union(columns, _.keys(uniqueColumns)),

            _post        = ghostBookshelf.model('Post').forge(),
            postTable    = _post.tableName,
            postId       = postTable + "." + _post.idAttribute,
            postWhere    = _.zipObject([postTable + '.status'], ['published']),

            _issue       = ghostBookshelf.model('Issue').forge(),
            issueTable   = _issue.tableName,
            issueId      = issueTable + "." + _issue.idAttribute,
            issueWhere   = _.zipObject([issueTable + '.status'], ['published']),

            _article     = ghostBookshelf.model('Article').forge(),
            articleTable = _article.tableName,
            articleId    = articleTable + "." + _article.idAttribute,
            articleWhere = {};

        return tagInstance.fetch().then(function() {
            // If we have a tag instance we need to modify our query.
            // We need to ensure we only select readables that contain
            // the tag given in the query param.

            var q = knex.select(all_cols) // posts
                .from(postTable)
                .join('posts_tags', 'posts_tags.post_id', '=', 'posts.id')
                .where(_.extend(postWhere, {
                    'posts_tags.tag_id': tagInstance.id,
                }))
                .unionAll(function () {
                    this.select(all_cols) // issues
                        .from(issueTable)
                        .join('issues_tags', 'issues_tags.issue_id', '=', 'issues.id')
                        .where(_.extend(issueWhere, {
                            'issues_tags.tag_id': tagInstance.id,
                        }));
                })
                .unionAll(function () {
                    this.select(all_cols) // articles
                        .from(articleTable)
                        .join('articles_tags', 'articles_tags.article_id', '=', 'articles.id')
                        .where(_.extend(articleWhere, {
                            'articles_tags.tag_id': tagInstance.id
                        }));
                })
                .limit(options.limit)
                .offset(options.limit * (options.page - 1))
                .orderBy('published_at', 'DESC')
                .orderBy('updated_at', 'DESC');

            return q;
        })

        // Fetch pagination information
        .then(function (resp) {
            function typeForUniqueColumn(key, val) {
                if (!_.contains(_.keys(uniqueColumns), key)) {
                    return false;
                }
                if (key === val) {
                    return false;
                }
                return uniqueColumns[key];
            }

            readablesResponse = _.map(resp, function(r) {
                // FIXME: hacky way to mimick regular calls to API
                return _.transform(r, function(result, val, key) {
                    delete result[key]

                    var fixedKey = key.slice(1, -1);

                    // assign type
                    var type = typeForUniqueColumn(fixedKey, val);
                    if (type) {
                        result.type = type;
                        return;
                    }

                    // fetch author
                    if (key === 'author') {
                        if (val === 'author_id') { return; }
                        result[key] = ghostBookshelf.model('User').forge({id: val}).fetch().then(function (author) {
                            result[key] = author;
                        });
                        return;
                    }

                    // fix remaining keys
                    if (fixedKey === val) {
                        return;
                    }
                    result[fixedKey] = val;
                });
            });

            promises = [];
            _.forEach(readablesResponse, function(r) {
                _.forOwn(r, function(val) {
                    if (val && typeof val.then === 'function') {
                        promises.push(val);
                    }
                });
            });

            return Promise.all(promises);
        }).then(function () {

            var q = knex.select('temp.id').from(function () {
                this.select(postId) // posts
                    .from(postTable)
                    .join('posts_tags', 'posts_tags.post_id', '=', 'posts.id')
                    .where(_.extend(postWhere, {
                        'posts_tags.tag_id': tagInstance.id,
                    }))
                    .unionAll(function () {
                        this.select(issueId) // issues
                            .from(issueTable)
                            .join('issues_tags', 'issues_tags.issue_id', '=', 'issues.id')
                            .where(_.extend(issueWhere, {
                                'issues_tags.tag_id': tagInstance.id,
                            }));
                    })
                    .unionAll(function () {
                        this.select(articleId) // articles
                            .from(articleTable)
                            .join('articles_tags', 'articles_tags.article_id', '=', 'articles.id')
                            .where(_.extend(articleWhere, {
                                'articles_tags.tag_id': tagInstance.id
                            }));
                    }).as('temp');
            }).count('id as aggregate');

            return q;
        })

        // Format response of data
        .then(function (resp) {
            var totalReadables = parseInt(resp[0].aggregate, 10),
                calcPages = Math.ceil(totalReadables / options.limit),
                pagination = {},
                meta = {},
                data = {};

            pagination.page = options.page;
            pagination.limit = options.limit;
            pagination.pages = calcPages === 0 ? 1 : calcPages;
            pagination.total = totalReadables;
            pagination.next = null;
            pagination.prev = null;

            // Pass include to each model so that toJSON works correctly
            if (options.include) {
                _.each(readableCollection.models, function (item) {
                    item.include = options.include;
                });
            }

            data.readables = readablesResponse;
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

});

Readables = ghostBookshelf.Collection.extend({
    model: Readable
});

module.exports = {
    Readable: ghostBookshelf.model('Readable', Readable),
    Readables: ghostBookshelf.collection('Readables', Readables)
};
