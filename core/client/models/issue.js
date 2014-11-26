import ValidationEngine from 'ghost/mixins/validation-engine';
import NProgressSaveMixin from 'ghost/mixins/nprogress-save';

var Issue = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
    validationType: 'issue',

    uuid: DS.attr('string'),
    title: DS.attr('string', {defaultValue: ''}),
    slug: DS.attr('string'),
    image: DS.attr('string'),
    pdf: DS.attr('string'),
    article_length: DS.attr('number', {defaultValue: 0}),
    series: DS.attr('string'),
    status: DS.attr('string', {defaultValue: 'draft'}),
    language: DS.attr('string', {defaultValue: 'en_US'}),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    updated_at: DS.attr('moment-date'),
    updated_by: DS.belongsTo('user', { async: true }),
    published_at: DS.attr('moment-date'),
    published_by: DS.belongsTo('user', { async: true }),
    articles: DS.hasMany('article', { embedded: 'always' }),
    tags: DS.hasMany('tag', { embedded: 'always' }),
    //## Computed issue properties
    isPublished: Ember.computed.equal('status', 'published'),
    isDraft: Ember.computed.equal('status', 'draft'),

    // remove client-generated tags, which have `id: null`.
    // Ember Data won't recognize/update them automatically
    // when returned from the server with ids.
    updateTags: function () {
        var tags = this.get('tags'),
        oldTags = tags.filterBy('id', null);

        tags.removeObjects(oldTags);
        oldTags.invoke('deleteRecord');
    },

});

export default Issue;
