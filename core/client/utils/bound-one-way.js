/**
 * Defines a property similarly to `Ember.computed.oneway`,
 * save that while a `oneway` loses its binding upon being set,
 * the `BoundOneWay` will continue to listen for upstream changes.
 *
 * This is an ideal tool for working with values inside of {{input}}
 * elements.
 * @param transform: a function to transform the **upstream** value.
 */
var BoundOneWay = function (upstream, transform) {
    if (typeof transform !== 'function') {
        // transform = null;
        transform = function (value) { return value; };
    }
    return Ember.computed(upstream, function (key, value) {
        return arguments.length > 1 ? transform(value) : transform(this.get(upstream));
    });
};

export default BoundOneWay;
