import styleBody from 'ghost/mixins/style-body';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';

var paginationSettings = {
    status: 'all',
    page: 1
};

var IssuesRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, ShortcutsRoute, styleBody, loadingIndicator, PaginationRouteMixin, {
    classNames: ['manage'],

    model: function () {
        return this.store.find('issue', paginationSettings);
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        this.setupPagination(paginationSettings);
    },

    stepThroughIssues: function (step) {
        var currentIssue = this.get('controller.currentIssue'),
            issues = this.get('controller.arrangedContent'),
            length = issues.get('length'),
            newPosition;

        newPosition = issues.indexOf(currentIssue) + step;

        // if we are on the first or last item
        // just do nothing (desired behavior is to not
        // loop around)
        if (newPosition >= length) {
            return;
        } else if (newPosition < 0) {
            return;
        }
        this.transitionTo('issues.issue', issues.objectAt(newPosition));
    },

    shortcuts: {
        'up': 'moveUp',
        'down': 'moveDown'
    },
    actions: {
        moveUp: function () {
            this.stepThroughIssues(-1);
        },
        moveDown: function () {
            this.stepThroughIssues(1);
        }
    }
});

export default IssuesRoute;
