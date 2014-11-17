var DeleteArticleController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            var self = this,
                model = this.get('model');

            // definitely want to clear the data store and article of any unsaved, client-generated tags
            model.updateTags();

            model.destroyRecord().then(function () {
                self.get('popover').closePopovers();
                self.send('backToIssue');
                self.notifications.showSuccess('Your article has been deleted.', { delayed: true });
            }, function () {
                self.notifications.showError('Your article could not be deleted. Please try again.');
            });

        },

        confirmReject: function () {
            return false;
        },
    },
    confirm: {
        accept: {
            text: 'Delete',
            buttonClass: 'btn btn-red'
        },
        reject: {
            text: 'Cancel',
            buttonClass: 'btn btn-default btn-minor'
        }
    }
});

export default DeleteArticleController;
