export default function() {
    var model = this.get('model'),
        imgUrl = model.get('image');

    return new Ember.Handlebars.SafeString(imgUrl);
}
