var IssueController = Ember.ObjectController.extend({
    isPublished: Ember.computed.equal('status', 'published'),

    actions: {
        showIssueContent: function () {
            this.transitionToRoute('issues.issue', this.get('model'));
        }
    }
});

export default IssueController;

