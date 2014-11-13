import loadingIndicator from 'ghost/mixins/loading-indicator';

var ArticleEditorEditArticleRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    model: function (params) {
        var self = this,
            article,
            articleId;

        articleId = Number(params.article_id);

        if (!_.isNumber(articleId) || !_.isFinite(articleId) || articleId % 1 !== 0 || articleId <= 0)
        {
            return this.transitionTo('error404', params.article_id);
        }

        article = this.store.getById('article', articleId);

        if (article) {
            return article;
        }
    },

    renderTemplate: function(controller, model) {
      this.render('issue_editor/edit/article', {
        into: 'issue_editor.edit',
      });
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        this.controllerFor('articles').set('currentArticle', model);
    },

    actions: {
        openArticleEditor: function () {
            this.transitionTo('article_editor.edit', this.get('controller.model'));
        },
        // deletePost: function () {
        //     this.send('openModal', 'delete-article', this.get('controller.model'));
        // }
    }
});

export default ArticleEditorEditArticleRoute;

