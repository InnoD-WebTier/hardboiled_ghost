import ArticleEditorViewMixin from 'ghost/mixins/article-editor-view-base';

var ArticleEditorNewView = Ember.View.extend(ArticleEditorViewMixin, {
    tagName: 'section',
    templateName: 'article-editor/edit',
    classNames: ['entry-container'],

    showArticle: function() {
      this.get('parentView').showArticle();
    }.on('didInsertElement'),

});

export default ArticleEditorNewView;
