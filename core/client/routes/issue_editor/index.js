var IssueEditorRoute = Ember.Route.extend({
    beforeModel: function () {
        this.transitionTo('issue_editor.new');
    }
});

export default IssueEditorRoute;
