import IssueEditorControllerMixin from 'ghost/mixins/issue-editor-controller-base';

var IssueEditorNewController = Ember.ObjectController.extend(IssueEditorControllerMixin, {
    actions: {
        /**
          * Redirect to issue_editor.edit after the first save
          */
        save: function(pdf) {
            var self = this;
            this._super(pdf).then(function (model) {
                if (model.get('id')) {
                    self.transitionToRoute('issue_editor.edit', model);
                }
            });
        }
    }
});

export default IssueEditorNewController;

