import itemView from 'ghost/views/item-view';

var ArticleItemView = itemView.extend({
  templateName: 'article-item-view',

  doubleClick: function () {
    // this.get('controller').send('openEditor');
  },

  click: function () {
    this.get('controller').send('showArticlePreview');
  }

});

export default ArticleItemView;
