/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var moment      = require('moment'),
    RSS         = require('rss'),
    _           = require('lodash'),
    url         = require('url'),
    Promise     = require('bluebird'),
    api         = require('../api'),
    config      = require('../config'),
    filters     = require('../filters'),
    template    = require('../helpers/template'),
    errors      = require('../errors'),
    cheerio     = require('cheerio'),

    frontendControllers,
    staticPostPermalink,
    oldRoute,
    dummyRouter = require('express').Router();

// Overload this dummyRouter as we only want the layer object.
// We don't want to keep in memory many items in an array so we
// clear the stack array after every invocation.
oldRoute = dummyRouter.route;
dummyRouter.route = function () {
    var layer;

    // Apply old route method
    oldRoute.apply(dummyRouter, arguments);

    // Grab layer object
    layer = dummyRouter.stack[0];

    // Reset stack array for memory purposes
    dummyRouter.stack = [];

    // Return layer
    return layer;
};

// Cache static post permalink regex
staticPostPermalink = dummyRouter.route('/:slug/:edit?');

function getIssueYear(options) {
    options.include = 'tags';
    return api.issues.browseByYear(options);
}

function getFeaturedPosts() {
    options = {
        featured: true,
        include: 'author,tags,fields',
        limit: 50, // ridiculous, don't care
    };
    return api.posts.browse(options);
}

function getPostPage(options, withFeatured) {
    return api.settings.read('postsPerPage').then(function (response) {
        var postPP = response.settings[0],
            postsPerPage = parseInt(postPP.value, 10);

        // No negative posts per page, must be number
        if (!isNaN(postsPerPage) && postsPerPage > 0) {
            options.limit = postsPerPage;
        }
        options.include = 'author,tags,fields';
        if (!withFeatured) {
            options.featured = false;
        }
        return api.posts.browse(options);
    });
}

function getReadablesPage(options) {
    return api.settings.read('postsPerPage').then(function (response) {
        var postPP = response.settings[0],
            postsPerPage = parseInt(postPP.value, 10);

        // No negative posts per page, must be number
        if (!isNaN(postsPerPage) && postsPerPage > 0) {
            options.limit = postsPerPage;
        }

        if (options.tag) {
            return api.readables.browseByTag(options);
        } else if (options.author) {
            return api.readables.browseByAuthor(options);
        }
    });
}

function formatPageResponse(posts, page, featured) {
    // Delete email from author for frontend output
    // TODO: do this on API level if no context is available
    if (featured) {
        featured = _.each(featured, function(f) {
            if (f.author) {
                delete f.author.email;
            }
            return f;
        });
    }
    posts = _.each(posts, function (post) {
        if (post.author) {
            delete post.author.email;
        }
        return post;
    });
    return {
        featured: featured,
        posts: posts,
        pagination: page.meta.pagination
    };
}

function formatReadablesResponse(readables, page) {
    // Delete email from author for frontend output
    // TODO: do this on API level if no context is available
    readables = _.each(readables, function (readable) {
        if (readable.author) {
            delete readable.author.email;
        }
        return readable;
    });
    return {
        readables: readables,
        pagination: page.meta.pagination
    };
}

function formatIssueListResponse(issues, page) {
    return {
        issues: issues,
        publish_years: page.meta.publish_years,
    };
}

function formatResponse(post) {
    // Delete email from author for frontend output
    // TODO: do this on API level if no context is available
    if (post.author) {
        delete post.author.email;
    }
    return {post: post};
}

function formatArticleResponse(article) {
    // Delete email from author for frontend output
    // TODO: do this on API level if no context is available
    if (article.author) {
        delete article.author.email;
    }
    return {article: article};
}

function handleError(next) {
    return function (err) {
        return next(err);
    };
}

function setResponseContext(req, res, data) {
    var contexts = [],
        pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1;

    // paged context
    if (!isNaN(pageParam) && pageParam > 1) {
        contexts.push('paged');
    }

    if (req.route.path === '/page/:page/') {
        contexts.push('index');
    } else if (req.route.path === '/') {
        contexts.push('home');
        contexts.push('index');
    } else if (/\/rss\/(:page\/)?$/.test(req.route.path)) {
        contexts.push('rss');
    } else if (/^\/tag\//.test(req.route.path)) {
        contexts.push('tag');
    } else if (/^\/author\//.test(req.route.path)) {
        contexts.push('author');
    } else if (data && data.post && data.post.page) {
        contexts.push('page');
    } else {
        contexts.push('post');
    }

    res.locals.context = contexts;
}

// Add Request context parameter to the data object
// to be passed down to the templates
function setReqCtx(req, data) {
    (Array.isArray(data) ? data : [data]).forEach(function (d) {
        d.secure = req.secure;
    });
}

/**
 * Returns the paths object of the active theme via way of a promise.
 * @return {Promise} The promise resolves with the value of the paths.
 */
function getActiveThemePaths() {
    return api.settings.read({
        key: 'activeTheme',
        context: {
            internal: true
        }
    }).then(function (response) {
        var activeTheme = response.settings[0],
            paths = config.paths.availableThemes[activeTheme.value];

        return paths;
    });
}

frontendControllers = {
    homepage: function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam
            },
            featured;

        // No negative pages, or page 1
        if (isNaN(pageParam) || pageParam < 1 || (pageParam === 1 && req.route.path === '/page/:page/')) {
            return res.redirect(config.paths.subdir + '/');
        }

        var featuredQuery = function() { return; }
        if (pageParam === 1) {
            featuredQuery = getFeaturedPosts;
        }

        return Promise.join(featuredQuery()).then(function(result) {
            if (result && result[0] && result[0].posts && !_.isEmpty(result[0].posts)) {
                featured = result[0].posts;
            }
            return getPostPage(options, false);
        }).then(function (page) {
            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > page.meta.pagination.pages) {
                return res.redirect(page.meta.pagination.pages === 1 ? config.paths.subdir + '/' : (config.paths.subdir + '/page/' + page.meta.pagination.pages + '/'));
            }

            setReqCtx(req, page.posts);

            // Render the page of posts
            filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                getActiveThemePaths().then(function (paths) {
                    var view = paths.hasOwnProperty('home.hbs') ? 'home' : 'index';

                    // If we're on a page then we always render the index
                    // template.
                    if (pageParam > 1) {
                        view = 'index';
                    }

                    setResponseContext(req, res);
                    res.render(view, formatPageResponse(posts, page, featured));
                });
            });
        }).catch(handleError(next));
    },
    author: function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam,
                author: req.params.slug
            };

        // Get url for tag page
        function authorUrl(author, page) {
            var url = config.paths.subdir + '/author/' + author + '/';

            if (page && page > 1) {
                url += 'page/' + page + '/';
            }

            return url;
        }

        // No negative pages, or page 1
        if (isNaN(pageParam) || pageParam < 1 || (req.params.page !== undefined && pageParam === 1)) {
            return res.redirect(authorUrl(options.author));
        }

        return getReadablesPage(options).then(function (page) {
            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > page.meta.pagination.pages) {
                return res.redirect(authorUrl(options.author, page.meta.pagination.pages));
            }

            setReqCtx(req, page.readables);
            if (page.meta.filters.author) {
                setReqCtx(req, page.meta.filters.author);
            }

            // Render the page of readables
            filters.doFilter('preAuthorPageRender', page.readables).then(function (readables) {
                getActiveThemePaths().then(function (paths) {
                    var view = paths.hasOwnProperty('author.hbs') ? 'author' : 'index',

                        // Format data for template
                        result = _.extend(formatReadablesResponse(readables, page), {
                            author: page.meta.filters.author ? page.meta.filters.author : ''
                        });

                    // If the resulting author is '' then 404.
                    if (!result.author) {
                        return next();
                    }

                    setResponseContext(req, res);
                    res.render(view, result);
                });
            });
        }).catch(handleError(next));
    },
    about: function(req, res, next) {
        return filters.doFilter('preAboutPageRender').then(function () {
            getActiveThemePaths().then(function (paths) {
                var view = 'about'
                setResponseContext(req, res);
                res.render(view, {});
            });
        }).catch(handleError(next));
    },
    contact: function(req, res, next) {
        return filters.doFilter('preContactPageRender').then(function () {
            getActiveThemePaths().then(function (paths) {
                var view = 'contact'
                setResponseContext(req, res);
                res.render(view, {});
            });
        }).catch(handleError(next));
    },
    search: function (req, res, next) {
        var queryParam = req.params.slug || req.query['search-query'] || req.body['search-query'] || '',
            options = {
                query: queryParam,
            };

        return filters.doFilter('preSearchPageRender').then(function () {
            getActiveThemePaths().then(function (paths) {
                var view = paths.hasOwnProperty('search.hbs') ? 'search' : 'index';
                setResponseContext(req, res);
                res.render(view, options);
            });
        }).catch(handleError(next));
    },
    issues: function (req, res, next) {
        // Parse the issue year
        return api.issues.browseByYear({include: 'tags'}).then(function (information) {
        var queryYears = information.meta.publish_years
        if (queryYears.length === 0) {
            var temporary = new Date().getFullYear()
        } else {
            var temporary = Math.max.apply(Math, queryYears);
        }
        console.log(temporary)
        var thisYear = temporary,
            yearParam = req.params.year !== undefined ? parseInt(req.params.year, 10) : thisYear,
            options = {
                year: yearParam
            };

        // No years < 2000, or current year
        if (isNaN(yearParam) || yearParam < 2000 || (yearParam === thisYear && req.route.path === '/issues/:year/')) {
            return res.redirect(config.paths.subdir + '/issues/');
        }

        return getIssueYear(options).then(function (year) {

            // TODO
            // If page is greater than number of pages we have, redirect to last page
            // if (yearParam > page.meta.pagination.pages) {
            //     return res.redirect(page.meta.pagination.pages === 1 ? config.paths.subdir + '/' : (config.paths.subdir + '/page/' + page.meta.pagination.pages + '/'));
            // }

            // setReqCtx(req, page.posts);

            // Render the year of issues
            filters.doFilter('preIssueListRender', year.issues).then(function (issues) {
                getActiveThemePaths().then(function (paths) {
                    var view = paths.hasOwnProperty('issues.hbs') ? 'issues' : 'index';

                    setResponseContext(req, res);
                    res.render(view, formatIssueListResponse(issues, year));
                });
            });
        }).catch(handleError(next));
        });
    },
    tag: function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam,
                tag: req.params.slug
            };

        // Get url for tag page
        function tagUrl(tag, page) {
            var url = config.paths.subdir + '/tag/' + tag + '/';

            if (page && page > 1) {
                url += 'page/' + page + '/';
            }

            return url;
        }

        // No negative pages, or page 1
        if (isNaN(pageParam) || pageParam < 1 || (req.params.page !== undefined && pageParam === 1)) {
            return res.redirect(tagUrl(options.tag));
        }

        return getReadablesPage(options).then(function (page) {
            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > page.meta.pagination.pages) {
                return res.redirect(tagUrl(options.tag, page.meta.pagination.pages));
            }

            setReqCtx(req, page.readables);
            if (page.meta.filters.tags) {
                setReqCtx(req, page.meta.filters.tags[0]);
            }

            // Render the page of readables
            filters.doFilter('preTagReadablesRender', page.readables).then(function (readables) {
                getActiveThemePaths().then(function (paths) {
                    var view = template.getThemeViewForTag(paths, options.tag),

                        // Format data for template
                        result = _.extend(formatReadablesResponse(readables, page), {
                            tag: page.meta.filters.tags ? page.meta.filters.tags[0] : ''
                        });

                    // If the resulting tag is '' then 404.
                    if (!result.tag) {
                        return next();
                    }
                    setResponseContext(req, res);
                    res.render(view, result);
                });
            });
        }).catch(handleError(next));
    },

    single: function (req, res, next) {
        var path = req.path,
            params,
            editFormat,
            usingStaticPermalink = false;

        api.settings.read('permalinks').then(function (response) {
            var permalink = response.settings[0],
                postLookup;

            editFormat = permalink.value[permalink.value.length - 1] === '/' ? ':edit?' : '/:edit?';

            // Convert saved permalink into an express Route object
            permalink = dummyRouter.route(permalink.value + editFormat);

            // Check if the path matches the permalink structure.
            //
            // If there are no matches found we then
            // need to verify it's not a static post,
            // and test against that permalink structure.
            if (permalink.match(path) === false) {
                // If there are still no matches then return.
                if (staticPostPermalink.match(path) === false) {
                    // Reject promise chain with type 'NotFound'
                    return Promise.reject(new errors.NotFoundError());
                }

                permalink = staticPostPermalink;
                usingStaticPermalink = true;
            }

            params = permalink.params;

            // Sanitize params we're going to use to lookup the post.
            postLookup = _.pick(permalink.params, 'slug', 'id');
            // Add author, tag and fields
            postLookup.include = 'author,tags,fields';

            // Query database to find post
            return api.posts.read(postLookup);
        }).then(function (result) {
            var post = result.posts[0],
                slugDate = [],
                slugFormat = [];

            if (!post) {
                return next();
            }

            function render() {
                // If we're ready to render the page but the last param is 'edit' then we'll send you to the edit page.
                if (params.edit) {
                    params.edit = params.edit.toLowerCase();
                }
                if (params.edit === 'edit') {
                    return res.redirect(config.paths.subdir + '/ghost/editor/' + post.id + '/');
                } else if (params.edit !== undefined) {
                    // reject with type: 'NotFound'
                    return Promise.reject(new errors.NotFoundError());
                }

                setReqCtx(req, post);

                filters.doFilter('prePostsRender', post).then(function (post) {
                    getActiveThemePaths().then(function (paths) {
                        var view = template.getThemeViewForPost(paths, post),
                            response = formatResponse(post);

                        setResponseContext(req, res, response);

                        res.render(view, response);
                    });
                });
            }

            // If we've checked the path with the static permalink structure
            // then the post must be a static post.
            // If it is not then we must return.
            if (usingStaticPermalink) {
                if (post.page) {
                    return render();
                }

                return next();
            }

            // If there is any date based paramter in the slug
            // we will check it against the post published date
            // to verify it's correct.
            if (params.year || params.month || params.day) {
                if (params.year) {
                    slugDate.push(params.year);
                    slugFormat.push('YYYY');
                }

                if (params.month) {
                    slugDate.push(params.month);
                    slugFormat.push('MM');
                }

                if (params.day) {
                    slugDate.push(params.day);
                    slugFormat.push('DD');
                }

                slugDate = slugDate.join('/');
                slugFormat = slugFormat.join('/');

                if (slugDate === moment(post.published_at).format(slugFormat)) {
                    return render();
                }

                return next();
            }

            return render();
        }).catch(function (err) {
            // If we've thrown an error message
            // of type: 'NotFound' then we found
            // no path match.
            if (err.type === 'NotFoundError') {
                return next();
            }

            return handleError(next)(err);
        });
    },

    singleIssue: function (req, res, next) {
        var articleNumParam = req.params.article_num !== undefined ? parseInt(req.params.article_num, 10) : 1,
            options = {
                article_num: articleNumParam,
                issue: req.params.slug
            },

            fetchedIssue,
            currentArticle;

        // No negative article_nums, or article_num 1
        if (isNaN(articleNumParam) || articleNumParam < 1 || (articleNumParam === 1 && req.route.path === '/issue/:slug/:article_num/')) {
            return res.redirect(config.paths.subdir + '/issue/' + options.issue);
        }

        return api.issues.read({slug: options.issue, include: 'tags,articles'}).then(function (result) {
            fetchedIssue = result.issues[0];

            // If article_num is greater than number of articles we have, redirect to last article_num
            if (articleNumParam > fetchedIssue.article_length) {
                return res.redirect(fetchedIssue.article_length === 1 ?
                                    (config.paths.subdir + '/issue/' + options.issue) :
                                    (config.paths.subdir + '/issue/' + options.issue + '/' + fetchedIssue.article_length)
                                   );
            }

            currentArticle = fetchedIssue.articles[articleNumParam - 1];
            return api.users.read({id: currentArticle.author});
        }).then(function (result) {
            currentArticle.author = result.users[0];
            var issue = fetchedIssue,
                slugDate = [],
                slugFormat = [];

            if (!issue) {
                return next();
            }

            // TODO: link editing from frontend
            // // If we're ready to render the article_num but the last param is 'edit' then we'll send you to the edit article_num.
            // if (params.edit) {
            //     params.edit = params.edit.toLowerCase();
            // }
            // if (params.edit === 'edit') {
            //     return res.redirect(config.paths.subdir + '/ghost/issue_editor/' + issue.id + '/');
            // } else if (params.edit !== undefined) {
            //     // reject with type: 'NotFound'
            //     return Promise.reject(new errors.NotFoundError());
            // }

            setReqCtx(req, issue);

            filters.doFilter('preSingleArticleRender', issue).then(function (issue) {
                getActiveThemePaths().then(function (paths) {
                    var view = paths.hasOwnProperty('issue.hbs') ? 'issue' : 'issue_index',
                        response = {
                          issue: fetchedIssue,
                          current_article: currentArticle,
                          article_num: articleNumParam
                        };

                    // If we're on a article_num then we always render the issue index
                    // template.
                    if (articleNumParam > 1) {
                        view = 'issue_index';
                    }

                    setResponseContext(req, res, response);

                    res.render(view, response);
                });
            });
        }).catch(function (err) {
            // If we've thrown an error message
            // of type: 'NotFound' then we found
            // no path match.
            if (err.type === 'NotFoundError') {
                return next();
            }

            return handleError(next)(err);
        });

    },

    singleArticle: function (req, res, next) {
        var path = req.path,
            params,
            editFormat,
            usingStaticPermalink = false;

        api.settings.read('permalinks').then(function (response) {
            var permalink = response.settings[0],
                articleLookup;

            editFormat = permalink.value[permalink.value.length - 1] === '/' ? ':edit?' : '/:edit?';

            // Convert saved permalink into an express Route object
            permalink = dummyRouter.route('/article' + permalink.value + editFormat);

            // TODO: hack, i think
            if (permalink.match(path) === false) {
                return Promise.reject(new errors.NotFoundError());
            }
            permalink.match(path);
            params = permalink.params;

            // Sanitize params we're going to use to lookup the article.
            articleLookup = _.pick(permalink.params, 'slug', 'id');
            // Add author, tag and fields
            articleLookup.include = 'author,tags,issue_id';

            // Query database to find article
            return api.articles.read(articleLookup);
        }).then(function (result) {
            var article = result.articles[0],
                slugDate = [],
                slugFormat = [];

            if (!article) {
                return next();
            }

            function render() {
                // If we're ready to render the page but the last param is 'edit' then we'll send you to the edit page.
                if (params.edit) {
                    params.edit = params.edit.toLowerCase();
                }
                if (params.edit === 'edit') {
                    return res.redirect(config.paths.subdir +
                                        '/ghost/issue_editor/' + article.issue.id +
                                        '/article_editor/' + article.id + '/'
                                       );
                } else if (params.edit !== undefined) {
                    // reject with type: 'NotFound'
                    return Promise.reject(new errors.NotFoundError());
                }

                setReqCtx(req, article);

                filters.doFilter('preArticlesRender', article).then(function (article) {
                    getActiveThemePaths().then(function (paths) {
                        var view = paths.hasOwnProperty('article.hbs') ? 'article' : 'index',
                            response = formatArticleResponse(article);

                        setResponseContext(req, res, response);

                        res.render(view, response);
                    });
                });
            }

            // If there is any date based paramter in the slug
            // we will check it against the article published date
            // to verify it's correct.
            if (params.year || params.month || params.day) {
                if (params.year) {
                    slugDate.push(params.year);
                    slugFormat.push('YYYY');
                }

                if (params.month) {
                    slugDate.push(params.month);
                    slugFormat.push('MM');
                }

                if (params.day) {
                    slugDate.push(params.day);
                    slugFormat.push('DD');
                }

                slugDate = slugDate.join('/');
                slugFormat = slugFormat.join('/');

                if (slugDate === moment(article.published_at).format(slugFormat)) {
                    return render();
                }

                return next();
            }

            return render();
        }).catch(function (err) {
            // If we've thrown an error message
            // of type: 'NotFound' then we found
            // no path match.
            if (err.type === 'NotFoundError') {
                return next();
            }

            return handleError(next)(err);
        });
    },

    rss: function (req, res, next) {
        function isPaginated() {
            return req.route.path.indexOf(':page') !== -1;
        }

        function isTag() {
            return req.route.path.indexOf('/tag/') !== -1;
        }

        function isAuthor() {
            return req.route.path.indexOf('/author/') !== -1;
        }

        // Initialize RSS
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            slugParam = req.params.slug,
            baseUrl = config.paths.subdir;

        if (isTag()) {
            baseUrl += '/tag/' + slugParam + '/rss/';
        } else if (isAuthor()) {
            baseUrl += '/author/' + slugParam + '/rss/';
        } else {
            baseUrl += '/rss/';
        }

        // No negative pages, or page 1
        if (isNaN(pageParam) || pageParam < 1 || (pageParam === 1 && isPaginated())) {
            return res.redirect(baseUrl);
        }

        return Promise.all([
            api.settings.read('title'),
            api.settings.read('description'),
            api.settings.read('permalinks')
        ]).then(function (result) {
            var options = {};

            if (pageParam) { options.page = pageParam; }
            if (isTag()) { options.tag = slugParam; }
            if (isAuthor()) { options.author = slugParam; }

            options.include = 'author,tags,fields';

            return api.posts.browse(options).then(function (page) {
                var title = result[0].settings[0].value,
                    description = result[1].settings[0].value,
                    permalinks = result[2].settings[0],
                    majorMinor = /^(\d+\.)?(\d+)/,
                    trimmedVersion = res.locals.version,
                    siteUrl = config.urlFor('home', {secure: req.secure}, true),
                    feedUrl = config.urlFor('rss', {secure: req.secure}, true),
                    maxPage = page.meta.pagination.pages,
                    feed;

                trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';

                if (isTag()) {
                    if (page.meta.filters.tags) {
                        title = page.meta.filters.tags[0].name + ' - ' + title;
                        feedUrl = siteUrl + 'tag/' + page.meta.filters.tags[0].slug + '/rss/';
                    }
                }

                if (isAuthor()) {
                    if (page.meta.filters.author) {
                        title = page.meta.filters.author.name + ' - ' + title;
                        feedUrl = siteUrl + 'author/' + page.meta.filters.author.slug + '/rss/';
                    }
                }

                feed = new RSS({
                    title: title,
                    description: description,
                    generator: 'Ghost ' + trimmedVersion,
                    feed_url: feedUrl,
                    site_url: siteUrl,
                    ttl: '60'
                });

                // If page is greater than number of pages we have, redirect to last page
                if (pageParam > maxPage) {
                    return res.redirect(baseUrl + maxPage + '/');
                }

                setReqCtx(req, page.posts);
                setResponseContext(req, res);

                filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                    posts.forEach(function (post) {
                        var item = {
                                title: post.title,
                                guid: post.uuid,
                                url: config.urlFor('post', {post: post, permalinks: permalinks}, true),
                                date: post.published_at,
                                categories: _.pluck(post.tags, 'name'),
                                author: post.author ? post.author.name : null
                            },
                            htmlContent = cheerio.load(post.html, {decodeEntities: false});

                        // convert relative resource urls to absolute
                        ['href', 'src'].forEach(function (attributeName) {
                            htmlContent('[' + attributeName + ']').each(function (ix, el) {
                                el = htmlContent(el);

                                var attributeValue = el.attr(attributeName);
                                attributeValue = url.resolve(siteUrl, attributeValue);

                                el.attr(attributeName, attributeValue);
                            });
                        });

                        item.description = htmlContent.html();
                        feed.item(item);
                    });
                }).then(function () {
                    res.set('Content-Type', 'text/xml; charset=UTF-8');
                    res.send(feed.xml());
                });
            });
        }).catch(handleError(next));
    }
};

module.exports = frontendControllers;
