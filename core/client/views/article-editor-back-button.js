var ArticleEditorBackButtonView = Ember.View.extend({
  click: function() {
    this.get('controller').send('backToIssue');
  },
});

export default ArticleEditorBackButtonView;
