export default function() {
    var model = this.get('model'),
        pdf_url = model.get('pdf'),
        blogUrl = this.get('config.blogUrl');

    return new Ember.Handlebars.SafeString(blogUrl + pdf_url);
}
