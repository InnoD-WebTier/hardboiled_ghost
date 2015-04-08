var frontend    = require('../controllers/frontend'),
    config      = require('../config'),
    express     = require('express'),
    utils       = require('../utils'),

    frontendRoutes;

frontendRoutes = function () {
    var router = express.Router(),
        subdir = config.paths.subdir;

    // ### Admin routes
    router.get(/^\/(logout|signout)\/$/, function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    router.get(/^\/signup\/$/, function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signup/');
    });

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });

    // ### Frontend routes
    router.get('/rss/', frontend.rss);
    router.get('/rss/:page/', frontend.rss);
    router.get('/feed/', function redirect(req, res) {
        /*jshint unused:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/rss/');
    });

    // Search
    router.get('/search/', frontend.search);
    router.get('/search/:slug/', frontend.search);

    // Tags
    router.get('/tag/:slug/rss/', frontend.rss);
    router.get('/tag/:slug/rss/:page/', frontend.rss);
    router.get('/tag/:slug/page/:page/', frontend.tag);
    router.get('/tag/:slug/', frontend.tag);

    // Authors
    router.get('/author/:slug/rss/', frontend.rss);
    router.get('/author/:slug/rss/:page/', frontend.rss);
    router.get('/author/:slug/page/:page/', frontend.author);
    router.get('/author/:slug/', frontend.author);

    // Issues
    router.get('/issues/', frontend.issues);
    router.get('/issues/:year/', frontend.issues);
    router.get('/issue/:slug/', frontend.singleIssue);
    router.get('/issue/:slug/:article_num/', frontend.singleIssue);

    // TODO
    // Articles
    // router.get('/article/:slug/', frontend.singleArticle);

    // Posts/Default
    router.get('/page/:page/', frontend.homepage);
    router.get('/', frontend.homepage);
    router.get('*', frontend.single);

    return router;
};

module.exports = frontendRoutes;
