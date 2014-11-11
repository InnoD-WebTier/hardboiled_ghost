import ValidationEngine from 'ghost/mixins/validation-engine';
import NProgressSaveMixin from 'ghost/mixins/nprogress-save';

var Article = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
    validationType: 'article',

    uuid: DS.attr('string'),
    title: DS.attr('string', {defaultValue: ''}),
    slug: DS.attr('string'),
    markdown: DS.attr('string', {defaultValue: ''}),
    html: DS.attr('string'),
    image: DS.attr('string'),
    pdf_start: DS.attr('number'),
    pdf_end: DS.attr('number'),
    issue: DS.belongsTo('issue', { async: true}),
    issue_id: DS.attr('number'),
    language: DS.attr('string', {defaultValue: 'en_US'}),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    author: DS.belongsTo('user',  { async: true }),
    author_id: DS.attr('number'),
    updated_at: DS.attr('moment-date'),
    published_at: DS.attr('moment-date'),
    published_by: DS.belongsTo('user', { async: true }),
    tags: DS.hasMany('tag', { embedded: 'always' }),

    // remove client-generated tags, which have `id: null`.
    // Ember Data won't recognize/update them automatically
    // when returned from the server with ids.
    updateTags: function () {
        var tags = this.get('tags'),
        oldTags = tags.filterBy('id', null);

        tags.removeObjects(oldTags);
        oldTags.invoke('deleteRecord');
    },

    isAuthoredByUser: function (user) {
        return parseInt(user.get('id'), 10) === parseInt(this.get('author_id'), 10);
    }

});

export default Article;
