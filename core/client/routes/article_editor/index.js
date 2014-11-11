var ArticleEditorRoute = Ember.Route.extend({
    beforeModel: function () {
        this.transitionTo('article_editor.new');
    }
});

export default ArticleEditorRoute;
