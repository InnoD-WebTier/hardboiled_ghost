import itemView from 'ghost/views/item-view';

var ArticleItemView = itemView.extend({
  doubleClick: function () {
    // this.get('controller').send('openEditor');
  },

  click: function () {
    this.get('controller').send('showArticlePreview');
  }

});

export default ArticleItemView;
