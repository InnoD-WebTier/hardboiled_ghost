var ArticleEditorSaveButtonView = Ember.View.extend({
    templateName: 'article-editor-save-button',
    tagName: 'section',
    classNames: ['splitbtn', 'js-publish-splitbutton'],

    // 'publishText': Ember.computed('controller.isPublished', function () {
    //     return this.get('controller.isPublished') ? 'Update Post' : 'Publish Now';
    // }),
    //
    // 'draftText': Ember.computed('controller.isPublished', function () {
    //     return this.get('controller.isPublished') ? 'Unpublish' : 'Save Draft';
    // }),

    'saveText': Ember.computed('controller.model.isNew', function () {
        return this.get('controller.model.isNew') ? 'Save Article' : 'Update Article';
    }),
});

export default ArticleEditorSaveButtonView;
