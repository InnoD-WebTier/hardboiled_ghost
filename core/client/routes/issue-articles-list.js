import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var IssueArticlesListRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
  model: function () {
    return this.store.findAll('article');
  },
});

export default IssueArticlesListRoute;
