// # Posts API
// RESTful API for the Post resource
var Promise         = require('bluebird'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    errors          = require('../errors'),
    utils           = require('./utils'),

    docName         = 'issues',
    allowedIncludes = ['created_by', 'updated_by', 'published_by', 'tags', 'articles'],
    issues;

// ## Helpers
function prepareInclude(include) {
    include = _.intersection(include.split(','), allowedIncludes);
    return include;
}

/**
 * ## Posts API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
issues = {

    /**
     * ### BrowseByYear
     * Find a paginated set of posts
     *
     * Will only return published posts unless we have an authenticated user and an alternative status
     * parameter.
     *
     * Will return without static pages unless told otherwise
     *
     * Can return posts for a particular tag by passing a tag slug in
     *
     * @public
     * @param {{context, year, limit, status, tag}} options (optional)
     * @returns {Promise(Posts)} Posts Collection with Meta
     */
    browseByYear: function browse(options) {
        options = options || {};

        if (!(options.context && options.context.user)) {
            options.status = 'published';
        }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return dataProvider.Issue.findYear(options);
    },

    /**
     * ### Browse
     * Find a paginated set of posts
     *
     * Will only return published posts unless we have an authenticated user and an alternative status
     * parameter.
     *
     * Will return without static pages unless told otherwise
     *
     * Can return posts for a particular tag by passing a tag slug in
     *
     * @public
     * @param {{context, year, limit, status, tag}} options (optional)
     * @returns {Promise(Posts)} Posts Collection with Meta
     */
    browse: function browse(options) {
        options = options || {};

        if (!(options.context && options.context.user)) {
            options.status = 'published';
        }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return dataProvider.Issue.findPage(options);
    },

    /**
     * ### Read
     * Find a post, by ID or Slug
     *
     * @public
     * @param {{id_or_slug (required), context, status, include, ...}} options
     * @return {Promise(Post)} Post
     */
    read: function read(options) {
        var attrs = ['id', 'slug', 'status'],
            data = _.pick(options, attrs);
        options = _.omit(options, attrs);

        // only published posts if no user is present
        if (!(options.context && options.context.user)) {
            data.status = 'published';
        }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return dataProvider.Issue.findOne(data, options).then(function (result) {
            if (result) {
                return {issues: [result.toJSON()]};
            }

            return Promise.reject(new errors.NotFoundError('Issue not found.'));
        });
    },

    /**
     * ### Add
     * Create a new post along with any tags
     *
     * @public
     * @param {Post} object
     * @param {{context, include,...}} options
     * @return {Promise(Post)} Created Post
     */
    add: function add(object, options) {
        options = options || {};
        return utils.checkObject(object, docName).then(function (checkedIssueData) {
            checkedIssueDataCopy = checkedIssueData
            if (options.include) {
              options.include = prepareInclude(options.include);
            }
            var user_id = options.context.user;
                return dataProvider.User.findOne({id: user_id}, {context: options.context});    
            }).then(function (user) {
                var userRole = user.related('roles').models[0];
                if (userRole.attributes.name === 'Author') {
                    return Promise.reject(new errors.NoPermissionError('You do not have permission to work with issues.'));
                }
            return dataProvider.Issue.add(checkedIssueDataCopy.issues[0], options);
        }).then(function (result) {
            result.attributes.title = result.attributes.series
            return {issues: [result.toJSON()]};
        });
    },

    /**
     * ### Edit
     * Update properties of a post
     *
     * @public
     * @param {Post} object Post or specific properties to update
     * @param {{id (required), context, include,...}} options
     * @return {Promise(Post)} Edited Post
     */
    edit: function edit(object, options) {
        // TODO
        // return canThis(options.context).edit.post(options.id).then(function () {

      return utils.checkObject(object, docName).then(function (checkedIssueData) {
        if (options.include) {
          options.include = prepareInclude(options.include);
        }
        issueStatus = object.issues[0]['status']
        articleNum = object.issues[0]['article_length']
        
        if (issueStatus === 'published' && articleNum === 0) {
            return Promise.reject(new errors.NoPermissionError('You cannot publish issues with no articles'));
        }
        return dataProvider.Issue.edit(checkedIssueData.issues[0], options);
      }).then(function (result) {
        if (result) {

          result.attributes.title = result.attributes.series
         
          var issue = result.toJSON();

          // If previously was not published and now is (or vice versa), signal the change
          issue.statusChanged = false;
          if (result.updated('status') !== result.get('status')) {
            issue.statusChanged = true;
          }
          return {issues: [issue]};
        }
        return Promise.reject(new errors.NotFoundError('Issue not found.'));
      });

        // }, function () {
        //     return Promise.reject(new errors.NoPermissionError('You do not have permission to edit posts.'));
        // });
    },


    /**
     * ### Destroy
     * Delete a issue, cleans up tag relations, but not unused tags
     *
     * @public
     * @param {{id (required), context,...}} options
     * @return {Promise(Issue)} Deleted Issue
     */
    destroy: function destroy(options) {
      //TODO
      // return canThis(options.context).destroy.issue(options.id).then(function () {

      return issues.read(options).then(function (result) {
        var markedIssue = result.issues[0];
        options = _.extend({
          pdf: markedIssue.pdf
        }, options);

        return dataProvider.Issue.destroy(options).then(function () {
          var deletedObj = result;

          if (deletedObj.issues) {
              _.each(deletedObj.issues, function (issue) {
                  issue.statusChanged = true;
              });
          }

          return deletedObj;
        });
      });

      // }, function () {
      //     return Promise.reject(new errors.NoPermissionError('You do not have permission to remove issues.'));
      // });
    }

};

module.exports = issues;
