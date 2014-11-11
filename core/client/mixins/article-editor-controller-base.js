/* global console */
import MarkerManager from 'ghost/mixins/marker-manager';
import ArticleModel from 'ghost/models/article';

// this array will hold properties we need to watch
// to know if the model has been changed (`controller.isDirty`)
var watchedProps = ['scratch', 'titleScratch', 'model.isDirty'];

Ember.get(ArticleModel, 'attributes').forEach(function (name) {
  watchedProps.push('model.' + name);
});

// watch if number of tags changes on the model
watchedProps.push('tags.[]');

var ArticleEditorControllerMixin = Ember.Mixin.create(MarkerManager, {

  needs: ['post-tags-input'],

  init: function () {
    var self = this;

    this._super();

    window.onbeforeunload = function () {
      return self.get('isDirty') ? self.unloadDirtyMessage() : null;
    };
  },

  // set by the editor route and `isDirty`. useful when checking
  // whether the number of tags has changed for `isDirty`.
  previousTagNames: null,

  tagNames: Ember.computed('tags.[]', function () {
    return this.get('tags').mapBy('name');
  }),

  // compares previousTagNames to tagNames
  tagNamesEqual: function () {
    var tagNames = this.get('tagNames'),
    previousTagNames = this.get('previousTagNames'),
    hashCurrent,
    hashPrevious;

    // beware! even if they have the same length,
    // that doesn't mean they're the same.
    if (tagNames.length !== previousTagNames.length) {
      return false;
    }

    // instead of comparing with slow, nested for loops,
    // perform join on each array and compare the strings
    hashCurrent = tagNames.join('');
    hashPrevious = previousTagNames.join('');

    return hashCurrent === hashPrevious;
  },

  // a hook created in editor-route-base's setupController
  modelSaved: function () {
    var model = this.get('model');

    // safer to updateTags on save in one place
    // rather than in all other places save is called
    model.updateTags();

    // set previousTagNames to current tagNames for isDirty check
    this.set('previousTagNames', this.get('tagNames'));

    // `updateTags` triggers `isDirty => true`.
    // for a saved model it would otherwise be false.

    // if the two "scratch" properties (title and content) match the model, then
    // it's ok to set isDirty to false
    if (this.get('titleScratch') === model.get('title') &&
        this.get('scratch') === model.get('markdown')) {

      this.set('isDirty', false);
    }
  },

  // an ugly hack, but necessary to watch all the model's properties
  // and more, without having to be explicit and do it manually
  isDirty: Ember.computed.apply(Ember, watchedProps.concat(function (key, value) {
    if (arguments.length > 1) {
      return value;
    }

    var model = this.get('model'),
    markdown = this.get('markdown'),
    title = this.get('title'),
    titleScratch = this.get('titleScratch'),
    scratch = this.getMarkdown().withoutMarkers,
    changedAttributes;

    if (!this.tagNamesEqual()) {
      return true;
    }

    if (titleScratch !== title) {
      return true;
    }

    // since `scratch` is not model property, we need to check
    // it explicitly against the model's markdown attribute
    if (markdown !== scratch) {
      return true;
    }

    // models created on the client always return `isDirty: true`,
    // so we need to see which properties have actually changed.
    if (model.get('isNew')) {
      changedAttributes = Ember.keys(model.changedAttributes());

      if (changedAttributes.length) {
        return true;
      }

      return false;
    }

    // even though we use the `scratch` prop to show edits,
    // which does *not* change the model's `isDirty` property,
    // `isDirty` will tell us if the other props have changed,
    // as long as the model is not new (model.isNew === false).
    if (model.get('isDirty')) {
      return true;
    }

    return false;
  })),

  // used on window.onbeforeunload
  unloadDirtyMessage: function () {
    return '==============================\n\n' +
      'Hey there! It looks like you\'re in the middle of writing' +
      ' something and you haven\'t saved all of your content.' +
      '\n\nSave before you go!\n\n' +
      '==============================';
  },

  //TODO: This has to be moved to the I18n localization file.
  //This structure is supposed to be close to the i18n-localization which will be used soon.
  messageMap: {
    errors: {
      article: {
        published: {
          'published': 'Update failed.',
          'draft': 'Saving failed.'
        },
        draft: {
          'published': 'Publish failed.',
          'draft': 'Saving failed.'
        }

      }
    },

    success: {
      article: {
        published: {
          'published': 'Updated.',
          'draft': 'Saved.'
        },
        draft: {
          'published': 'Published!',
          'draft': 'Saved.'
        }
      }
    }
  },

  showSaveNotification: function (delay) {
    this.notifications.showSuccess("Saved.", { delayed: delay });
  },

  showErrorNotification: function (errors, delay) {
    this.notifications.showError(errors[0].message, { delayed: delay });
  },

  shouldFocusTitle: Ember.computed('model', function () {
    return !!this.get('model.isNew');
  }),

  actions: {
    save: function () {
      var isNew = this.get('isNew'),
      self = this;

      self.notifications.closePassive();

      // ensure an incomplete tag is finalised before save
      this.get('controllers.post-tags-input').send('addNewTag');

      // Set the properties that are indirected
      // set markdown equal to what's in the editor, minus the image markers.
      this.set('markdown', this.getMarkdown().withoutMarkers);
      this.set('title', this.get('titleScratch'));

      // Set issue
      this.set('issue_id', this.get('issueId'));

      return this.get('model').save().then(function (model) {
        self.showSaveNotification(isNew ? true : false);
        return Ember.RSVP.resolve(model);
      }).catch(function (errors) {
        self.showErrorNotification(errors);
        return Ember.RSVP.reject(errors);
      });
    },

    // set from a `sendAction` on the codemirror component,
    // so that we get a reference for handling uploads.
    setCodeMirror: function (codemirrorComponent) {
      var codemirror = codemirrorComponent.get('codemirror');

      this.set('codemirrorComponent', codemirrorComponent);
      this.set('codemirror', codemirror);
    },

    // fired from the gh-markdown component when an image upload starts
    disableCodeMirror: function () {
      this.get('codemirrorComponent').disableCodeMirror();
    },

    // fired from the gh-markdown component when an image upload finishes
    enableCodeMirror: function () {
      this.get('codemirrorComponent').enableCodeMirror();
    },

    // Match the uploaded file to a line in the editor, and update that line with a path reference
    // ensuring that everything ends up in the correct place and format.
    handleImgUpload: function (e, result_src) {
      var editor = this.get('codemirror'),
      line = this.findLine(Ember.$(e.currentTarget).attr('id')),
      lineNumber = editor.getLineNumber(line),
      match = line.text.match(/\([^\n]*\)?/),
      replacement = '(http://)';

      if (match) {
        // simple case, we have the parenthesis
        editor.setSelection(
          {line: lineNumber, ch: match.index + 1},
          {line: lineNumber, ch: match.index + match[0].length - 1}
        );
      } else {
        match = line.text.match(/\]/);
        if (match) {
          editor.replaceRange(
            replacement,
            {line: lineNumber, ch: match.index + 1},
            {line: lineNumber, ch: match.index + 1}
          );
          editor.setSelection(
            {line: lineNumber, ch: match.index + 2},
            {line: lineNumber, ch: match.index + replacement.length }
          );
        }
      }
      editor.replaceSelection(result_src);
    },

    // Make sure editor starts with markdown shown
    isPreview: false,

    togglePreview: function (preview) {
      this.set('isPreview', preview);
    },
  }
});

export default ArticleEditorControllerMixin;