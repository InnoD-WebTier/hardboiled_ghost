import loadingIndicator from 'ghost/mixins/loading-indicator';

var IssueEditorEditRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
  model: function (params) {
    var self = this,
    issue,
    issueId;

    issueId = Number(params.issue_id);

    if (!_.isNumber(issueId) || !_.isFinite(issueId) || issueId % 1 !== 0 || issueId <= 0)
      {
        return this.transitionTo('error404', params.issue_id);
      }

      return this.store.findById('issue', issueId).then(function (issue) {
        return issue;
      }).catch(function (errors) {
        return self.transitionTo('issues.index');
      });

  },

  renderTemplate: function(controller, model) {
    var self = this;

    this._super();

    this.store.find('article', {
      issue_id: model.get('id'),
    }).then(function (articles) {
      self.render('issue-articles-list', {
        into: 'issue_editor/edit',
        outlet: 'issue-articles-list',
        controller: 'issue-articles-list',
        model: articles,
      });
    }).catch(function (errors) {
      self.notifications.showAPIError(errors);
    });
  },

  serialize: function(model) {
    return {issue_id: model.get('id')};
  },

  setupController: function (controller, model) {
    this._super(controller, model);

    controller.set('titleValue', model.get('title'));
    controller.set('publishedAtValue', model.get('published_at'));
  },

  actions: {
    openIssueEditor: function () {
      this.transitionTo('issue_editor.edit', this.get('controller.model'));
    },
    deletePost: function () {
      this.send('openModal', 'delete-issue', this.get('controller.model'));
    }
  }
});

export default IssueEditorEditRoute;

