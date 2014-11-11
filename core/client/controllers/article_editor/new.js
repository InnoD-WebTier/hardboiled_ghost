
import ArticleEditorControllerMixin from 'ghost/mixins/article-editor-controller-base';

var ArticleEditorNewController = Ember.ObjectController.extend(ArticleEditorControllerMixin, {
    actions: {
        /**
          * Redirect to editor after the first save
          */
        save: function () {
            var self = this;
            this._super().then(function (model) {
                if (model.get('id')) {
                    self.transitionToRoute('article_editor.edit', model);
                }
            });
        }
    },
});

export default ArticleEditorNewController;
