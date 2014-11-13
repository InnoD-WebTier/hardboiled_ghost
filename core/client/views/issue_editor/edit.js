import mobileQuery from 'ghost/utils/mobile';

var IssuesEditorEditView = Ember.View.extend({
  classNames: ['issues-editor-container'],
  tagName: 'section',
  showingArticle: false,

  // Issues editor view callbacks
  showIssue: function () {
    $('.js-issue-content').animate({right: '0', left: '0', margin: '0 auto', width: '67%'}, 300);
    $('.js-article-content').animate({right: '-100%', left: '100%'}, 300);
  },
  showFullArticle: function () {
    $('.js-issue-content').animate({right: '100%', left: '-100%'}, 300);
    $('.js-article-content').animate({right: '0', left: '0', width: '100%'}, 300);
  },
  showArticlePreview: function () {
    $('.js-issue-content').animate({right: '0', left: '0', margin: '0', width: '33%'}, 300);
    $('.js-article-content').animate({right: '0', left: 'initial',  width: '67%'}, 300);
  },

  setChangeLayout: function () {
    var self = this;
    this.set('changeLayout', function changeLayout() {
      if (!self.showingArticle) {
        return;
      }
      if (mobileQuery.matches) {
        //transitioned to mobile layout, so show content
        self.showFullArticle();
      } else {
        //went from mobile to desktop
        self.showArticlePreview();
      }
    });
  }.on('init'),

  attachChangeLayout: function () {
    mobileQuery.addListener(this.changeLayout);
  }.on('didInsertElement'),

  detachChangeLayout: function () {
    mobileQuery.removeListener(this.changeLayout);
  }.on('willDestroyElement')
});

export default IssuesEditorEditView;
