var NewArticleButtons = Ember.Component.extend({

  setup: function () {
    var $this = this.$(),
    self = this;

    // TODO
    // articleUploader.call($this, {
    //     fileStorage: this.get('config.fileStorage')
    // });
    // $this.on('uploadsuccess', function (event, result) {
    //   if (result && result !== '' && result !== 'http://') {
    //     self.sendAction('uploaded', result);
    //   }
    // });
    // $this.find('.js-cancel').on('click', function () {
    //   self.sendAction('canceled');
    // });

  }.on('didInsertElement'),

});

export default NewArticleButtons;
