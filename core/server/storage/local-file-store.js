// # Local File System Image Storage module
// The (default) module for storing images, using the local file system

var cloudinary = require('cloudinary'),
    express    = require('express'),
    fs         = require('fs-extra'),
    path       = require('path'),
    util       = require('util'),
    Promise    = require('bluebird'),
    errors     = require('../errors'),
    config     = require('../config'),
    utils      = require('../utils'),
    baseStore  = require('./base');

function LocalFileStore() {
}
util.inherits(LocalFileStore, baseStore);

// ### Save
// Saves the image to storage (the file system)
// - image is the express image object
// - returns a promise which ultimately returns the full url to the uploaded image
LocalFileStore.prototype.save = function (image) {
    var targetDir = this.getTargetDir(config.paths.imagesPath),
        targetFilename;

    return this.getUniqueFileName(this, image, targetDir).then(function (filename) {
        targetFilename = filename;
        return Promise.promisify(fs.mkdirs)(targetDir);
    }).then(function () {
        return Promise.promisify(fs.copy)(image.path, targetFilename);
    }).then(function () {
        // The src for the image must be in URI format, not a file system path, which in Windows uses \
        // For local file system storage can use relative path so add a slash
        var fullUrl = (config.paths.subdir + '/' + config.paths.imagesRelPath + '/' +
            path.relative(config.paths.imagesPath, targetFilename)).replace(new RegExp('\\' + path.sep, 'g'), '/');
        return fullUrl;
    }).catch(function (e) {
        errors.logError(e);
        return Promise.reject(e);
    });
};

LocalFileStore.prototype.exists = function (filename) {
    return new Promise(function (resolve) {
        fs.exists(filename, function (exists) {
            resolve(exists);
        });
    });
};

// middleware for serving the files
LocalFileStore.prototype.serve = function () {
    // For some reason send divides the max age number by 1000
    return express['static'](config.paths.imagesPath, {maxAge: utils.ONE_YEAR_MS});
};

// ### Save PDF
// Saves the pdf to storage (the file system)
// - pdf is the express pdf object
// - returns a promise which ultimately returns the full url to the uploaded pdf,
//   as well as an image of the first page
LocalFileStore.prototype.savePdf = function(pdf) {
    var targetDir = this.getTargetDir(config.paths.pdfPath),
        targetFilename;

    return this.getUniqueFileName(this, pdf, targetDir).then(function (filename) {
        targetFilename = filename;
        return Promise.promisify(fs.mkdirs)(targetDir);
    }).then(function () {
        return Promise.promisify(fs.copy)(pdf.path, targetFilename);
    }).then(function () {
        // The src for the image must be in URI format, not a file system path, which in Windows uses \
        // For local file system storage can use relative path so add a slash
        var fullUrl = (config.paths.subdir + '/' +
                       config.paths.pdfRelPath + '/' +
                       path.relative(config.paths.pdfPath, targetFilename)
                      ).replace(new RegExp('\\' + path.sep, 'g'), '/');
        return fullUrl;
    }).catch(function (e) {
        errors.logError(e);
        return Promise.reject(e);
    });
};

// ### Delete PDF
// Delete the pdf at the path given
LocalFileStore.prototype.deletePdf = function(pdfPath) {
  return Promise.promisify(fs.unlink)(pdfPath.substring(1));
};

// middleware for serving the files
LocalFileStore.prototype.servePdf = function () {
    // For some reason send divides the max age number by 1000
    return express['static'](config.paths.pdfPath, {maxAge: utils.ONE_YEAR_MS});
};

module.exports = LocalFileStore;
