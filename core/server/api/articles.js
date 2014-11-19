// # Articles API
// RESTful API for the Article resource
var Promise         = require('bluebird'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    canThis         = require('../permissions').canThis,
    errors          = require('../errors'),
    utils           = require('./utils'),

    docName         = 'articles',
    allowedIncludes = ['issue_id', 'created_by', 'updated_by', 'author', 'tags'],
    articles;

// ## Helpers
function prepareInclude(include) {
    var index;

    include = _.intersection(include.split(','), allowedIncludes);
    index = include.indexOf('author');

    if (index !== -1) {
        include[index] = 'author_id';
    }

    return include;
}

/**
 * ## Articles API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
articles = {

    /**
     * ### Browse
     * Find a paginated set of issues
     *
     * TODO
     // * Will only return published issues unless we have an authenticated user and an alternative status
     // * parameter.
     *
     * Will return without static pages unless told otherwise
     *
     * Can return issues for a particular tag by passing a tag slug in
     *
     * @public
     * @param {{context, issue_id, page, limit, status, staticPages, tag}} options (optional)
     * @returns {Promise(Posts)} Posts Collection with Meta
     */
    browse: function browse(options) {
        options = options || {};

        //TODO
        // if (!(options.context && options.context.user)) {
        //     options.status = 'published';
        // }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return dataProvider.Article.findPage(options);
    },

    /**
     * ### Read
     * Find a article, by ID or Slug
     *
     * @public
     * @param {{id_or_slug (required), context, status, include, ...}} options
     * @return {Promise(Article)} Article
     */
    read: function read(options) {
        var attrs = ['id', 'slug'],
            data = _.pick(options, attrs);
        options = _.omit(options, attrs);

        // TODO:
        // only published articles if no user is present
        // if (!(options.context && options.context.user)) {
        //     data.status = 'published';
        // }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return dataProvider.Article.findOne(data, options).then(function (result) {
            if (result) {
                return {articles: [result.toJSON()]};
            }

            return Promise.reject(new errors.NotFoundError('Article not found.'));
        });
    },

    /**
     * ### Edit
     * Update properties of a article
     *
     * @public
     * @param {Article} object Article or specific properties to update
     * @param {{id (required), context, include,...}} options
     * @return {Promise(Article)} Edited Article
     */
    edit: function edit(object, options) {
      //TODO
        // return canThis(options.context).edit.article(options.id).then(function () {

        return utils.checkObject(object, docName).then(function (checkedArticleData) {
            if (options.include) {
                options.include = prepareInclude(options.include);
            }

            return dataProvider.Article.edit(checkedArticleData.articles[0], options);
        }).then(function (result) {
            if (result) {
                var article = result.toJSON();

                // TODO
                // If previously was not published and now is (or vice versa), signal the change
                // article.statusChanged = false;
                // if (result.updated('status') !== result.get('status')) {
                //     article.statusChanged = true;
                // }

                return {articles: [article]};
            }

            return Promise.reject(new errors.NotFoundError('Article not found.'));
        });

        // }, function () {
        //     return Promise.reject(new errors.NoPermissionError('You do not have permission to edit articles.'));
        // });
    },

    /**
     * ### Add
     * Create a new article along with any tags
     *
     * @public
     * @param {Article} object
     * @param {{context, include,...}} options
     * @return {Promise(Article)} Created Article
     */
    add: function add(object, options) {
        options = options || {};

        // TODO
        // return canThis(options.context).add.article().then(function () {

        return utils.checkObject(object, docName).then(function (checkedArticleData) {
            if (options.include) {
                options.include = prepareInclude(options.include);
            }

            return dataProvider.Article.add(checkedArticleData.articles[0], options);
        }).then(function (result) {
            var article = result.toJSON();

            // TODO
            // if (article.status === 'published') {
            //     // When creating a new article that is published right now, signal the change
            //     article.statusChanged = true;
            // }
            return {articles: [article]};
        });

        // }, function () {
        //     return Promise.reject(new errors.NoPermissionError('You do not have permission to add articles.'));
        // });
    },

    /**
     * ### Destroy
     * Delete a article, cleans up tag relations, but not unused tags
     *
     * @public
     * @param {{id (required), context,...}} options
     * @return {Promise(Article)} Deleted Article
     */
    destroy: function destroy(options) {

      // TODO
        // return canThis(options.context).destroy.article(options.id).then(function () {

        var readOptions = _.extend({}, options);
        return articles.read(readOptions).then(function (result) {
            return dataProvider.Article.destroy(options).then(function () {
                var deletedObj = result;

                if (deletedObj.articles) {
                    _.each(deletedObj.articles, function (article) {
                        article.statusChanged = true;
                    });
                }

                return deletedObj;
            });
        });

        /*
        var readOptions = _.extend({}, options),
            readArticle,
            articleNum;
        return articles.read(readOptions).then(function (result) {
            if (!result.articles) {
              return Promise.reject('could not find article to destroy');
            }
            markedArticle = result.articles[0];
            articleNum = result.article_num;
            debugger;
            return dataProvider.Issue.findOne({context: options.context, id: markedArticle.issue_id});
        }).then(function (issue) {
            issue.article_length = issue.article_length - 1;
            dataProvider.Issue.edit(issue, {context: options.context, id: markedArticle.issue_id});
            debugger;
        }).then(function () {
            return dataProvider.Article.destroy(options);
        }).then(function () {
            markedArticle.statusChanged = true;
            return markedArticle;
        });
        */

        // }, function () {
        //     return Promise.reject(new errors.NoPermissionError('You do not have permission to remove articles.'));
        // });
    }

};

module.exports = articles;
