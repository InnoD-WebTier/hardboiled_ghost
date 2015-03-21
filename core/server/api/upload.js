var Promise    = require('bluebird'),
    path       = require('path'),
    fs         = require('fs-extra'),
    storage    = require('../storage'),
    errors     = require('../errors'),
    exec       = require('child_process').exec,

    upload;

function isImage(type, ext) {
    if ((type === 'image/jpeg' || type === 'image/png' || type === 'image/gif' || type === 'image/svg+xml')
            && (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.svg' || ext === '.svgz')) {
        return true;
    }
    return false;
}

function isPdf(type, ext) {
  if (type === 'application/pdf' && ext === '.pdf') {
    return true;
  }
  return false;
}

/**
 * ## Upload API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
upload = {

    /**
     * ### Add Image
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    add: function (options) {
        var store = storage.getStorage(),
            type,
            ext,
            filepath;

        if (!options.uploadimage || !options.uploadimage.type || !options.uploadimage.path) {
            return Promise.reject(new errors.NoPermissionError('Please select an image.'));
        }

        type = options.uploadimage.type;
        ext = path.extname(options.uploadimage.name).toLowerCase();
        filepath = options.uploadimage.path;

        return Promise.resolve(isImage(type, ext)).then(function (result) {
            if (!result) {
                return Promise.reject(new errors.UnsupportedMediaTypeError('Please select a valid image.'));
            }
        }).then(function () {
            return store.save(options.uploadimage);
        }).then(function (url) {
            return url;
        }).finally(function () {
            // Remove uploaded file from tmp location
            return Promise.promisify(fs.unlink)(filepath);
        });
    },

    /**
     * ### Add PDF
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    addPdf: function (options) {
        var store = storage.getStorage(),
            type,
            ext,
            filepath;

        if (!options.uploadpdf || !options.uploadpdf.type || !options.uploadpdf.path) {
            return Promise.reject(new errors.NoPermissionError('Please select a pdf.'));
        }

        type = options.uploadpdf.type;
        ext = path.extname(options.uploadpdf.name).toLowerCase();
        filepath = options.uploadpdf.path;

        return Promise.resolve(isPdf(type, ext)).then(function (result) {
            if (!result) {
                return Promise.reject(new errors.UnsupportedMediaTypeError('Please select a valid pdf.'));
            }
        }).then(function () {
            return store.savePdf(options.uploadpdf);
        }).then(function (filepath) {
            pdfUrl = filepath;

            pdf_tmp = options.uploadpdf.path;
            img_tmp = pdf_tmp + ".jpg"; 
            var convert_cmd = "convert "+pdf_tmp+"[0] -density 96 -resize 850x1100 -alpha flatten "+img_tmp;
            return new Promise(function (resolve) {
                child = exec(convert_cmd, function(error, stdout, stderr) {
                    if(error != null) {
                        console.error("ERROR unable to generate jpg for pdf");
                        console.error("command failed: " + convert_cmd);
                        console.error("stderr: " + stderr);
                        console.error("Do you have convert (ImageMagick) and GhostScript installed?")
                    }
                });
                child.on('exit', function(code, signal) {
                  if(code == null || code != 0) {
                      return Promise.reject(new errors.InternalServerError("Could not generate an image for uploaded PDF."))
                  }
                  var image = {
                      type: 'image/jpeg',
                      name: options.uploadpdf.name+".jpg",
                      path: img_tmp,
                  }
                  resolve(store.save(image));
                })
            });
        }).then(function (imgUrl) {
            return {
              pdfUrl: pdfUrl,
              imgUrl: imgUrl,
            }
        }).finally(function () {
            // Remove generated image from tmp location
            return Promise.promisify(fs.unlink)(img_tmp);
        }).finally(function () {
            // Remove uploaded file from tmp location
            return Promise.promisify(fs.unlink)(pdf_tmp);
        });
    },
};

module.exports = upload;
