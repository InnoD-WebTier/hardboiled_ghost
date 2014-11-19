import IssueEditorControllerMixin from 'ghost/mixins/issue-editor-controller-base';
import SlugGenerator from 'ghost/models/slug-generator';
import boundOneWay from 'ghost/utils/bound-one-way';

var IssueEditorEditController = Ember.ObjectController.extend(IssueEditorControllerMixin, {
  needs: ['articles'],

  slugValue: boundOneWay('model.slug'),
  //Lazy load the slug generator for slugPlaceholder
  slugGenerator: Ember.computed(function () {
    return SlugGenerator.create({
      ghostPaths: this.get('ghostPaths'),
      slugType: 'issue'
    });
  }),
  //Requests slug from title
  generateSlugPlaceholder: function () {
    var self = this,
    title = this.get('titleScratch');

    this.get('slugGenerator').generateSlug(title).then(function (slug) {
      self.set('slugPlaceholder', slug);
    });
  },

  actions: {
    togglePublished: function() {
      var self   = this,
      issue      = this.get('model'),
      prevStatus = issue.get('status');

      if (prevStatus === 'published') {
        issue.set('status', 'draft');
      } else {
        issue.set('status', 'published');
      }

      return issue.save().then(function (model) {
        return model;
      }).catch(function (errors) {
        issue.rollback();
        return Ember.RSVP.reject(errors);
      });
    },

    /**
     * triggered by user manually changing slug
     */
    updateSlug: function (newSlug) {
      var slug = this.get('slug'),
      self = this;

      newSlug = newSlug || slug;

      newSlug = newSlug && newSlug.trim();

      // Ignore unchanged slugs or candidate slugs that are empty
      if (!newSlug || slug === newSlug) {
        // reset the input to its previous state
        this.set('slugValue', slug);

        return;
      }

      this.get('slugGenerator').generateSlug(newSlug).then(function (serverSlug) {
        // If after getting the sanitized and unique slug back from the API
        // we end up with a slug that matches the existing slug, abort the change
        if (serverSlug === slug) {
          return;
        }

        // Because the server transforms the candidate slug by stripping
        // certain characters and appending a number onto the end of slugs
        // to enforce uniqueness, there are cases where we can get back a
        // candidate slug that is a duplicate of the original except for
        // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

        // get the last token out of the slug candidate and see if it's a number
        var slugTokens = serverSlug.split('-'),
        check = Number(slugTokens.pop());

        // if the candidate slug is the same as the existing slug except
        // for the incrementor then the existing slug should be used
        if (_.isNumber(check) && check > 0) {
          if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
            self.set('slugValue', slug);

            return;
          }
        }

        self.set('slug', serverSlug);

        if (self.hasObserverFor('titleScratch')) {
          self.removeObserver('titleScratch', self, 'titleObserver');
        }

        // If this is a new article.  Don't save the model.  Defer the save
        // to the user pressing the save button
        if (self.get('isNew')) {
          return;
        }

        return self.get('model').save();
      }).catch(function (errors) {
        self.showErrors(errors);
        self.get('model').rollback();
      });
    },
  },
});

export default IssueEditorEditController;
