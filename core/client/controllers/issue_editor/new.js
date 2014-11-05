var IssuesNewController = Ember.Controller.extend({
    actions: {
      save: function() {
      },

      setPdf: function (pdf) {
        var self = this,
            issue = this.get('model');

        Ember.Logger.log('calling set pdf');
        Ember.Logger.log(pdf);

        issue.set('pdf', pdf);
        issue.set('title', 'post_rand_' + Math.round(Math.random() * 100));
        issue.set('status', 'draft');

        Ember.Logger.log('saving');
        Ember.Logger.log(issue);

        return issue.save().then(function (model) {
          Ember.Logger.log("successfully saved!");
          return model;
        }).catch(function (errors) {
          Ember.Logger.log("error saving. :(");
          Ember.Logger.log(errors);
          return Ember.RSVP.reject(errors);
        });

        // if (this.get('isNew')) {
        //   return;
        // }
        //
        // this.get('model').save().catch(function (errors) {
        //   self.showErrors(errors);
        //   self.get('model').rollback();
        // });
      },

      clearCoverImage: function () {
        var self = this;

        Ember.Logger.log('clearing pdf');
        this.set('pdf', '');

        // if (this.get('isNew')) {
        //   return;
        // }
        //
        // this.get('model').save().catch(function (errors) {
        //   self.showErrors(errors);
        //   self.get('model').rollback();
        // });
      },
    },
});

export default IssuesNewController;
