var IssueController = Ember.ObjectController.extend({
    isPublished: Ember.computed.equal('status', 'published'),

    actions: {
        showIssueContent: function () {
            Ember.Logger.log('showIssueContent called');
            Ember.Logger.log(this.get('model'));
            this.transitionToRoute('issues.issue', this.get('model'));
        }
    }
});

export default IssueController;

