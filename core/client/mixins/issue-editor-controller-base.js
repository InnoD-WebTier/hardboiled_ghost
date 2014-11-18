/* global moment */
import {parseDateString, formatDate} from 'ghost/utils/date-formatting';
import SlugGenerator from 'ghost/models/slug-generator';
import boundOneWay from 'ghost/utils/bound-one-way';

var IssueEditorControllerMixin = Ember.Mixin.create({
    /**
     * The placeholder is the published date of the issue,
     * or the current date if the pubdate has not been set.
     */
    publishedAtPlaceholder: Ember.computed('publishedAtValue', function () {
        var model = this.get('model'),
            pubDate = model.get('published_at');
        if (pubDate) {
            return formatDate(pubDate);
        }
        return formatDate(moment());
    }),
    publishedAtValue: boundOneWay('published_at', formatDate),

    //Lazy load the slug generator
    slugGenerator: Ember.computed(function () {
        return SlugGenerator.create({
            ghostPaths: this.get('ghostPaths'),
            slugType: 'issue'
        });
    }),

    showErrors: function (errors) {
        errors = Ember.isArray(errors) ? errors : [errors];
        this.notifications.showErrors(errors);
    },

    actions: {
      save: function(pdf) {
        var self = this,
            isNew = this.get('isNew'),
            issue = this.get('model');

        self.notifications.closePassive();

        issue.set('title', this.get('title'));
        issue.set('published_at', this.get('published_at'));
        issue.set('pdf', pdf);
        issue.set('status', 'draft');

        return issue.save().then(function (model) {
          return model;
        }).catch(function (errors) {
          issue.rollback();
          return Ember.RSVP.reject(errors);
        });
      },

      setTitle: function (title) {
          var self = this,
              currentTitle = this.get('title') || '';

          // Only update if the title has changed
          if (currentTitle === title) {
              return;
          }

          this.set('title', title);

          var model = this.get('model');

          // If this is a new post.  Don't save the model.  Defer the save
          // to the user pressing the save button
          if (model.get('isNew')) {
              return;
          }

          model.save().catch(function (errors) {
              self.showErrors(errors);
              self.get('model').rollback();
          });
      },

      /**
       * Parse user's set published date.
       * Action sent by post settings menu view.
       */
      setPublishedAt: function (userInput) {
          var errMessage = '',
              newPublishedAt = parseDateString(userInput),
              publishedAt = this.get('published_at'),
              self = this;

          if (!userInput) {
              //Clear out the published_at field for a draft
              if (this.get('isDraft')) {
                  this.set('published_at', null);
              }
              return;
          }

          // Validate new Published date
          if (!newPublishedAt.isValid()) {
              errMessage = 'Published Date must be a valid date with format: ' +
                  'DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
          }
          if (newPublishedAt.diff(new Date(), 'h') > 0) {
              errMessage = 'Published Date cannot currently be in the future.';
          }

          //If errors, notify and exit.
          if (errMessage) {
              this.showErrors(errMessage);
              return;
          }

          // Do nothing if the user didn't actually change the date
          if (publishedAt && publishedAt.isSame(newPublishedAt)) {
              return;
          }

          //Validation complete
          this.set('published_at', newPublishedAt);
          var model = this.get('model');

          // If this is a new post.  Don't save the model.  Defer the save
          // to the user pressing the save button
          if (model.get('isNew')) {
              return;
          }

          model.save().catch(function (errors) {
              self.showErrors(errors);
              self.get('model').rollback();
          });
      },

    },
});

export default IssueEditorControllerMixin;
