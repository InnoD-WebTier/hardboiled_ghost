import ArticleItemView from 'ghost/views/article-item-view';

var ReorderableArticlesCollection = Ember.CollectionView.extend({
  tagName: 'ol',
  classNames: ['posts-list'],

  didInsertElement: function () {
    var self = this,
        list = this.$()[0];

    this.set('initialOrdering', _.map(this.get('content.content'), function(e) {
      return e.id;
    }));
    new Slip(list, {childTagName: 'li'});

    list.addEventListener('slip:beforewait', function(e) {
      e.preventDefault();
    }, this);
    list.addEventListener('slip:reorder', function(e) {
      e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
      self.get('controller').send('reorderArticle', e.detail.originalIndex, e.detail.spliceIndex);
    }, this);
  },

  itemViewClass: ArticleItemView,

});

export default ReorderableArticlesCollection;
