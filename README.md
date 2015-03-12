Quickstart:
===========

Install Node.js and NPM (Node Package Manager). Then:

    $ npm install -g grunt-cli
    $ npm install
    $ grunt init (and grunt prod if you want to run Ghost in production mode)
    $ grunt dev

(make sure you're inside the directory when running the last 3 commands)

Workflow
========

- Backend
  - Run `grunt dev` from the root and start hackin
  - Learn to use the Node Debugger. You will be infinitely grateful.
- Frontend theme
  - Go to `content/themes/hb_theme` and run `grunt watch`. This will watch for any changes in the SCSS and compile automatically. (i.e. You can just refresh the page to see your changes)
  - Use the Javascript debugger!



Hardboiled Node App
===================

The Hardboiled app is an augmented [Ghost](https://ghost.org/) blog. Specifically, we've augmented it so that the Hardboiled team can publish their magazine issues directly through Ghost's CMS (Content Management System).

There are essentially three components to the Ghost app:

- An Ember JS app as the CMS for administrators and authors. This part is dynamic and routed mostly on the front-end.
- A **static** website for regular users to get content. The static site is themed.
- The backend: this includes a database, routes for the static frontend, an API to fetch data, and controllers to coerce the data into the right place and format for a user on the frontend using Ember's front-end router.

Here's the important part of the directory structure for the app. An explanation of the numbered items follows.

	root	 .
	1		├── content 
	  1		|   ├── data
	  2		|   ├── images
	  3		|   ├── pdf
	  4		|   └── themes
	2		├── core
	  1		|   ├── built
	  2		|   ├── client
	    1	|	|   ├── adapters
	    2	|	|   ├── assets
	    3	|	|   ├── components
	    4	|	|   ├── controllers
	    5	|	|   ├── helpers
	    6	|	|   ├── mixins
	    7	|	|   ├── models
	    8	|	|   ├── routes
	    9	|	|   ├── serializers
	    10	|	|   ├── templates
	    11	|	|   ├── validators
	    12	|	|   ├── views
	    13	|	|   └── router.js
	  3		|   └── server
	    1	|	    ├── api
	    2	|	    ├── controllers/frontend.js
	    3	|	    ├── data
	      1	|		|	├── schema.js
	      2	|		|	└── import
	    4	|	    ├── models
	    5	|	    ├── routes
	    6	|	    ├── search
	    7	|	    └── storage
	3		├── Gruntfile.js
	4		├── bower.json
	5		├── config.js
	6		└── __cleanalldata.sh

Descriptions
==
Individual files are **bolded**, directories are not. Let me know if you have any questions.

1. `content` Different kinds of static files.
	1. `data` Database and other data for the application. Don't mess with this when in production.
	2. `images` Static images served to blog. Images uploaded via the CMS get stored here.
	3. `pdf` Static PDF files served to blog. PDFs uploaded via the CMS get stored here.
	4. `themes` Theme files for blog, written as Handlebars templates. Most of the frontend design work happens here.
2. `core` The "core" of the app. Almost all of the code lives here.
	1. `built` Compiled Javascript+CSS+HTML files for dynamic CMS.
	2. `client` All code run on the client side (i.e. in the user's browser).
		1. `adapters` Contains adapters for query objects. When a model is queried from the database, its adapter will automagically "include" related models by checking its Ember Data type. For example, if a model `user` has an embedded hasMany relation for `role`, then querying for a `user` will also query for the `roles` attached to that user.
		2. `assets` Static assets for dynamic Ember CMS app. _Also includes logic for uploading images and pdfs._
		3. `components` Reusable Ember Components for use in Handlebars templates.
		4. `controllers` Controllers that feed data from the model associated with the route to the appropriate views and templates. Ember is an MVC framework; you should read the docs to understand this further.
		5. `helpers` Template helpers. These are sort of like reusable "functions" for displaying/retrieving/coercing the appropriate data for the template.
		6. `mixins` Mixins for views, controllers, and routes. If you haven't seen ES6 Javascript before, mixins are kind of like abstract classes that you can "include" into other classes.
		7. `routes` Front end routing JS specifically for Ember CMS app. Ember routing occurs on the front end only; these routes query the backend API using AJAX and other magic.
		8. `serializers` Serializers for models. Models are modified locally on the client's browser before being serialized and then saved to the backend database via an API call and an upload.
		9. `templates` Handlebars templates specifically for the Ember CMS. Templates can be partial (i.e., there can be multiple templates rendered at a single route)
		10. `validators` Front-end validation for models before they are saved to database via API call.
		11. `views` Ember Views. These control the behavior the behavior of templates via Javascript.
		12. **`router.js`** Router for Ember CMS. New routes get defined here, routing logic lives in the `routes` directory.
	3. `server` Node.js backend server logic. Nitty gritty stuff.
		1. `api` API for querying/inserting/updating backend database. Defined per model, based on Ember Data.
		2. **`controllers/frontend.js`** Ties website frontend to backend data. When a user goes to the Hardboiled site, the queries and organizes all the data correctly to present to the frontend template (which is defined by the theme).
		3. `data` Database magic.
			1. **`schema.js`** Schema for models.
			2. `import` Logic for importing data from other blogs, like Wordpress.
		4. `models` Backend representation of models. Built on [Bookshelf.js](http://http://bookshelfjs.org/) and [knex.js](http://knexjs.org/).
		5. `routes` Actual routes for frontent, api, and admin (the last is the only one that has its own front-end router)
		6. `search` _Unfinished!_ Search logic. I recommend using one of the following search tools: [norch](https://github.com/fergiemcdowall/norch), [ghostHunter](https://github.com/jamalneufeld/ghostHunter), or [lunr.js](http://lunrjs.com/). Of the three, I think the first is the best way to go, since it actually does indexing. The latter two build the _entire_ search index on the front end everytime the user loads the website, so it's not scalable. :(
		7. `storage` Logic for saving static files to server filesystem on upload (not to the database).
3. `Gruntfile.js` Gruntfile. Read [here](http://gruntjs.com/getting-started).
4. `bower.json` Bower info and dependencies. Read [here](http://bower.io).
5. `package.json` NodeJS info and dependencies.
6. `__cleanalldata.sh` Whipes the database. Useful for dev, but don't run this on prod!


I _highly_ recommend going through the EmberJS [tutorial](http://emberjs.com/). It may be tedious but you will be a thousand times more prepared to dive in and contribute. In general, reading the documentation for Ember and the other things I've linked above is key.

ToDo
====

<<<<<<< HEAD
Backend
--

Things marked with **<!!!>** have higher priority.

- **<!!!>** Search
  - See `search` directory above. Check out [norch](https://github.com/fergiemcdowall/norch), [ghostHunter](https://github.com/jamalneufeld/ghostHunter), or [lunr.js](http://lunrjs.com/).
  - I think the best way to handle this is to index all Issues, Articles, and Posts when they are saved to the database.
- Magazine issues should not have a title.
  - Currently, they do. HB Magazines only have an "Issue Number", which is represented as its "series" in the Schema for Issue on the backend.
- Magazines should not be allowed to publish until they have at least one Article.
  - This fixes the infinite redirect loop
- Permissions for Editor, Author, and User need to be tested.
- **<!!!>** Need to be able to import data from Hardboiled Wordpress. (All posts and users) 
  - A lot of this has been done [in this repo](https://github.com/InnoD-WebTier/wp2ghost), but it's really slow and buggy right now. You'll need to get access to the Hardboiled Wordpress to be able to export their data (and then import it into Ghost).
- Tags for Issues and Articles seem wonky...
- Getting the first page of a PDF is SUPER hacky right now!!!
  - I upload the PDF to Cloudinary because they have a nice API for getting images from PDF, and then query the image of the first page from there. **THIS IS A TERRIBLE SOLUTION** someone should fix this or just make HB upload the cover photo manually.
  - Username for [Cloudinary](https://cloudinary.com) account is `aykamko@gmail.com`. Ask Maruchi for the password.
- Posts need to be able to be marked as carousel-able.
  - Their cover image should be displayed in the carousel on the front page.
- New Articles should take the status of the Issue that contains them automatically
  - i.e., if an Issue is published, then new Articles added to that issue _after the Issue has been published_
   should be immediately published

Frontend
--

We were originally using [blog.ghost.org](http://blog.ghost.org/) and [Medium](https://medium.com/) for inspiration/motivation.

- Comments for posts! [https://disqus.com/](https://disqus.com/)
- Things that need to be styled: (Abhinav)
  - CMS for Issue and Article creation
  - Sidebar
  - Authors should have a little card with their info in their posts, articles, and search (scroll to bottom of [this post](http://blog.ghost.org/wishlist/))
  - Tag and Author "search" pages
  - Table of contents for Articles
  - Carousel on front page (this needs to be hooked up to backend as well)

- An About Page for the Hardboiled Team (Robert)
  - Like [this](http://hardboiled.berkeley.edu/about/) but much more sexy with pictures and bios and pretty/interesting things.
  - The About Page should be a **static URL Post** (probably).

- The only "tabs" Hardboiled wants is Home, About, and Issues.
  - Archived Issues on their [current site](http://hardboiled.berkeley.edu/about/) becomes Issues for us.
  - Web Exclusives are merged in as regular Posts.
  - The Course tab from their current site becomes a *hidden* static page, only accessible via direct URL.
  - No Photos tab.
  - No Contact tab, just a footer.
  - No explicit "Home" tab. Clicking on the HB logo brings you to Home page.
