// # Posts API
// RESTful API for the Post resource
var Promise         = require('bluebird'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    utils           = require('./utils'),

    docName         = 'issues',
    allowedIncludes = ['created_by', 'updated_by', 'published_by', 'tags'],
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
     * @param {{context, page, limit, status, staticPages, tag}} options (optional)
     * @returns {Promise(Posts)} Posts Collection with Meta
     */
    browse: function browse(options) {
        options = options || {};

        // if (!(options.context && options.context.user)) {
        //     options.status = 'published';
        // }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return dataProvider.Issue.findAll(options).then(function (result) {
            return {issues: result.toJSON()};
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
          if (options.include) {
            options.include = prepareInclude(options.include);
          }

          console.log(checkedIssueData.issues[0]);

          return dataProvider.Issue.add(checkedIssueData.issues[0], options);
        }).then(function (result) {
          var issue = result.toJSON();

          console.log(issue);

          // if (issue.status === 'published') {
          //   // When creating a new post that is published right now, signal the change
          //   post.statusChanged = true;
          // }
          return {issues: [issue]};
        });
    },

};

module.exports = issues;
