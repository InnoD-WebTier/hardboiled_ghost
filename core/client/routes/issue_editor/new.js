import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var IssuesNewRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
  classNames: ['issues-new'],

  model: function() {
    var self = this;
    return this.get('session.user').then(function (user) {
      return self.store.createRecord('issue', {
        author: user
      });
    });
  },

  setupController: function (controller, model) {
    this._super(controller, model);
    controller.set('publishedAtValue', '');
    controller.set('titleValue', '');
  },

  actions: {
    willTransition: function (transition) {
      //TODO: not working :(
      var controller = this.get('controller'),
          model = controller.get('model'),
          isNew = model.get('isNew');

      if (isNew) {
        model.deleteRecord();
      }

      window.onbeforeunload = null;
    },

    save: function() {
      this.get('controller').send('save');
    },
  },

});

export default IssuesNewRoute;
