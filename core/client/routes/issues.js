import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var IssuesIndexRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
  classNames: ['new-issue'],

  model: function () {
    // var self = this;
    return this.store.findAll('issue');
  },
});

export default IssuesIndexRoute;
