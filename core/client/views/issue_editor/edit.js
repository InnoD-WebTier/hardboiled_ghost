var IssuesEditorEditView = Ember.View.extend({
    classNames: ['issues-editor-container'],
    tagName: 'section',

    // Issues editor view callbacks
    showIssue: function () {
        $('.js-issue-content').animate({right: '0', left: '0'}, 300);
        $('.js-article-content').animate({right: '-100%', left: '100%', 'margin-left': '15px'}, 300);
    },
    showArticle: function () {
        $('.js-issue-content').animate({right: '100%', left: '-100%'}, 300);
        $('.js-article-content').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
    }
});

export default IssuesEditorEditView;
