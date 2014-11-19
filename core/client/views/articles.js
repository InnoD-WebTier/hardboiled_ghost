var ArticlesView = Ember.View.extend({
    dirtyOrdering: Ember.computed('controller.orderingChanges', function () {
        return !(_.isEmpty(this.get('controller.orderingChanges')));
    }),
});

export default ArticlesView;
