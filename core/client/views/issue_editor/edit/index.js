var IssueEditorEditIndexView = Ember.View.extend({
  classNames: ['article-editor-container'],
  tagName: 'section',

  showFullArticle: function () {
    this.get('parentView').showFullArticle();
  }

});

export default IssueEditorEditIndexView;
