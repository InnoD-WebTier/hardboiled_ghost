import loadingIndicator from 'ghost/mixins/loading-indicator';

var IssuesIssueRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    model: function (params) {
        var self = this,
            issue,
            issueId;

        issueId = Number(params.issue_id);

        if (!_.isNumber(issueId) || !_.isFinite(issueId) || issueId % 1 !== 0 || issueId <= 0)
        {
            return this.transitionTo('error404', params.issue_id);
        }

        issue = this.store.getById('issue', issueId);

        if (issue) {
            return issue;
        }
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        this.controllerFor('issues').set('currentIssue', model);
    },
});

export default IssuesIssueRoute;

