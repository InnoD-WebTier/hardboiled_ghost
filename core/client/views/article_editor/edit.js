import ArticleEditorViewMixin from 'ghost/mixins/article-editor-view-base';

var ArticleEditorView = Ember.View.extend(ArticleEditorViewMixin, {
    tagName: 'section',
    classNames: ['entry-container']
});

export default ArticleEditorView;
