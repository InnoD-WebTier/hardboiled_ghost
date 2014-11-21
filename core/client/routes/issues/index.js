import MobileIndexRoute from 'ghost/routes/mobile-index-route';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import mobileQuery from 'ghost/utils/mobile';

var IssuesIndexRoute = MobileIndexRoute.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    noIssues: false,
    // Transition to a specific issue if we're not on mobile
    beforeModel: function () {
        if (!mobileQuery.matches) {
            return this.goToIssue();
        }
    },

    setupController: function (controller, model) {
        /*jshint unused:false*/
        controller.set('noIssues', this.get('noIssues'));
    },

    goToIssue: function () {
        // the store has been populated by IssuesRoute
        var issues = this.store.all('issue'),
            issue = issues.get('firstObject');
        if (issue) {
            return this.transitionTo('issues.issue', issue);
        }
        this.set('noIssues', true);
    },

    //Mobile issues route callback
    desktopTransition: function () {
        this.goToIssue();
    }
});

export default IssuesIndexRoute;
