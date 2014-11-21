var si = require('search-index');

var document_types = {
    USER: 0,
    POST: 1,
    ISSUE: 2,
    ARTICLE: 3,
    TAG: 4
};

var parsers = {

};

var parse = function (type, data) {
    switch (type)
    {
        case document_types.USER:

            break;
        case document_types.POST:
            
            break;
        case document_types.ISSUE:
            
            break;
        case document_types.ARTICLE:
            
            break;
        case document_types.TAG:
            
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