// # Readables API
// RESTful API for the Readable resource
var Promise         = require('bluebird'),
    dataProvider    = require('../models'),

    readables;

/**
 * ## Readables API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
readables = {

    /**
     * ### Browse by tag
     * Find a paginated set of published readables for a particular tag.
     *
     * @public
     * @param {{page, limit, tag}} options
     * @returns {Promise(Posts|Issues|Articles)} Readables Collection with Meta
     */
    browseByTag: function browse(options) {
        options = options || {};

        return dataProvider.Readable.findPageByTag(options);
    },

    /**
     * ### Browse by author
     * Find a paginated set of published readables for a particular author.
     *
     * @public
     * @param {{page, limit, author}} options
     * @returns {Promise(Posts|Issues|Articles)} Readables Collection with Meta
     */
    browseByAuthor: function browse(options) {
        options = options || {};

        return dataProvider.Readable.findPageByAuthor(options);
    },

};

module.exports = readables;
