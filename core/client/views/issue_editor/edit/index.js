var IssueEditorEditIndexView = Ember.View.extend({
  classNames: ['article-editor-container'],
  tagName: 'section',

  showArticle: function () {
    this.get('parentView').showArticle();
  }

});

export default IssueEditorEditIndexView;
