var si = require('search-index');

var document_types = {
    USER: 0,
    POST: 1,
    ISSUE: 2,
    ARTICLE: 3,
    TAG: 4
};

var parsers = {
    user = function (user) {

    },
    post = function (post) {

    },
    issue = function (issue) {

    },
    article = function (article) {

    },
    tag = function (tag) {

    }
};

var parse = function (type, data) {
    switch (type)
    {
        case document_types.USER:
            return parsers.user(data);
            break;
        case document_types.POST:
            return parsers.post(data);
            break;
        case document_types.ISSUE:
            return parsers.issue(data);
            break;
        case document_types.ARTICLE:
            return parsers.article(data);
            break;
        case document_types.TAG:
            return parsers.tag(data);
            break;
        default:
            throw 'Not a valid document type.'
    }
};

var add = function (type, data) {
    
};

var update = function (type, data) {
    
};

var del = function (type, data) {
    
};

var query = function (querystring) {
    
};

module.exports = {
    document_types = document_types,
    add = add,
    update = update,
    del = del,
    query = query
};