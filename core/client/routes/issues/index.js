import MobileIndexRoute from 'ghost/routes/mobile-index-route';
import mobileQuery from 'ghost/utils/mobile';

var IssuesIndexRoute = MobileIndexRoute.extend(SimpleAuth.AuthenticatedRouteMixin, {
    beforeModel: function () {
      // the store has been populated by IssuesRoute
      // var issues = this.store.all('issues');
      this.transitionTo('issues.issue');
    }
});

export default IssuesIndexRoute;
