var IssueArticlesListController = Ember.ArrayController.extend({

  orderingChanges: [],

  initialOrdering: [],

  computeOrderingChanges: function () {
    var initial = this.get('initialOrdering');
    if (_.isEmpty(initial)) { return []; }

    var content  = this.get('model.content'),
        changes  = [],
        curModel = null;
    // assummes that initial and content are the same length
    for (var i = 0; i < content.length; i++) {
      curModel = content[i];
      if (curModel.id != initial[i]) {
        changes.push([curModel, i]);
      }
    }
    return changes;
  },

  reinsertArticle: function(source, dest) {
    var content = this.get('model.content');
    content.splice(dest, 0, content.splice(source, 1)[0]);
  },

  actions: {
    reorderArticle: function(source, dest) {
      this.reinsertArticle(source, dest);
      this.set('orderingChanges', this.computeOrderingChanges());
    },
    saveOrder: function() {
      _.forEach(this.get('orderingChanges'), function (change) {
        var model    = change[0],
            newIndex = change[1];
        model.set('article_num', newIndex).save();
      });

      this.set('initialOrdering', _.map(this.get('model.content'), function (a) {
        return a.id;
      }));
      this.set('orderingChanges', []);
    },
  }

});

export default IssueArticlesListController;
