import loadingIndicator from 'ghost/mixins/loading-indicator';

var IssueEditorEditRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {

  model: function (params) {
    var self = this,
    issue,
    issueId;

    issueId = Number(params.issue_id);

    if (!_.isNumber(issueId) || !_.isFinite(issueId) || issueId % 1 !== 0 || issueId <= 0) {
      return this.transitionTo('error404', params.issue_id);
    }

    issue = this.store.getById('issue', issueId);

    if (issue) {
      return issue;
    }

    return this.store.findById('issue', issueId).then(function (issue) {
      return issue;
    }).catch(function (errors) {
      return self.transitionTo('issues.index');
    });

  },

  afterModel: function(model) {
    this.renderArticleList(model);
  },

  renderArticleList: function(_model) {
    var self               = this,
        mainController     = this.get('controller'),
        articlesController = this.controllerFor('articles'),
        model;

    var afterIssueModel = function() {
      return self.store.find('article', {
        issue_id: model.get('id')
      }).then(function (articles) {
        articlesController.set('model', articles);
        articlesController.set('initialOrdering', _.map(articles.content, function(a) {
          return a.id;
        }));
        self.render('articles', {
          into: 'issue_editor/edit',
          outlet: 'issue-article-list',
          controller: articlesController
        });
      }).catch(function (errors) {
        self.notifications.showAPIError(errors);
      });
    };

    if (_model) {
      model = _model;
      return afterIssueModel();
    } else {
      /* need to reloadRecord for the issue because article_length might have changed */
      return this.store.reloadRecord(this.modelFor('issue_editor.edit')).then(function(issue) {
        model = issue;
        afterIssueModel();
      });
    }
  },

  serialize: function(model) {
    return {issue_id: model.get('id')};
  },

  setupController: function (controller, model) {
    this._super(controller, model);

    controller.set('issueId', model.get('id'));
    controller.set('titleValue', model.get('title'));
    controller.set('publishedAtValue', model.get('published_at'));
  },

  actions: {
    openIssueEditor: function () {
      this.transitionTo('issue_editor.edit', this.get('controller.model'));
    },
    deletePost: function () {
      this.send('openModal', 'delete-issue', this.get('controller.model'));
    },
    reRenderArticles: function () {
      this.renderArticleList();
    },
  }
});

export default IssueEditorEditRoute;

