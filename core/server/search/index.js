var indexer = require('./indexer');

module.exports = {
    types = indexer.document_types,
    add = indexer.add,
    update = indexer.update,
    del = indexer.del,
    query = indexer.query
};