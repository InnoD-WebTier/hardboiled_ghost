var ReorderableArticlesList = Ember.View.extend({
    didInsertElement: function () {
        var self = this,
            list = this.$()[0];
        new Slip(list, {childTagName: 'li'});

        list.addEventListener('slip:beforewait', function(e) {
          e.preventDefault();
        }, this);
        list.addEventListener('slip:reorder', function(e) {
          if (e.detail.insertBefore !== e.target.nextSibling) {
            self.get('controller').send('reorderedArticles');
          }
          e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
        }, this);
    },
});

export default ReorderableArticlesList;
