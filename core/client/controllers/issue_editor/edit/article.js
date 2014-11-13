var IssueEditorEditArticleController = Ember.ObjectController.extend({

  actions: {
    showArticlePreview: function () {
      this.transitionToRoute('issue_editor.edit.article', this.get('model'));
    }
  }
});

export default IssueEditorEditArticleController;

