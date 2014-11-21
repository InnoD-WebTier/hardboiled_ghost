import loadingIndicator from 'ghost/mixins/loading-indicator';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';

var IssuesIssueRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, ShortcutsRoute, {
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

        paginationSettings = {
            id: issueId,
            status: 'all',
        };

        return self.store.find('issue', paginationSettings).then(function (records) {
            var issue = records.get('firstObject');

            if (issue) {
                return issue;
            }

            return self.transitionTo('issues.index');
        });
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        this.controllerFor('issues').set('currentIssue', model);
    },

    shortcuts: {
        'enter': 'openIssueEditor',
        'command+backspace, ctrl+backspace': 'deleteIssue'
    },
    actions: {
        openIssueEditor: function () {
            this.transitionTo('issue_editor.edit', this.get('controller.model'));
        },
        deleteIssue: function () {
            this.send('openModal', 'delete-issue', this.get('controller.model'));
        }
    }
});

export default IssuesIssueRoute;

