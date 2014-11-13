var IssueEditorEditArticleView = Ember.View.extend({
  classNames: ['article-content-preview'],

  showArticlePreview: function () {
    var parentView = this.get('parentView');

    parentView.showingArticle = true;
    parentView.showArticlePreview();
  }.on('didInsertElement'),

});

export default IssueEditorEditArticleView;
