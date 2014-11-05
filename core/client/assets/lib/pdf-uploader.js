import ghostPaths from 'ghost/utils/ghost-paths';

var UploadUi,
    pdfUpload,
    Ghost = ghostPaths();

UploadUi = function ($upload_button, settings) {
    var $url = '<div class="js-url"><input class="url js-upload-url" type="url" placeholder="http://"/></div>',
        $cancel = '<a class="image-cancel js-cancel" title="Delete"><span class="hidden">Delete</span></a>',
        $progress =  $('<div />', {
            'class' : 'js-upload-progress progress progress-success active',
            'role': 'progressbar',
            'aria-valuemin': '0',
            'aria-valuemax': '100'
        }).append($('<div />', {
            'class': 'js-upload-progress-bar bar',
            'style': 'width:0%'
        }));

    $.extend(this, {
        complete: function (result) {
          Ember.Logger.log(result);
          $('<a/>').addClass('btn')
            .addClass('btn-blue')
            .attr('href', result)
            .text(result)
            .appendTo('#submit-div');
          $upload_button.trigger('uploadsuccess', [result]);
        },

        bindFileUpload: function () {
            var self = this;

            $upload_button.find('.js-fileupload').fileupload().fileupload('option', {
                url: Ghost.apiRoot + '/uploads/pdf',
                autoupload: false,
                add: function (e, data) {
                    /*jshint unused:false*/
                  $.each(data.files, function(index, file) {
                    var node = $('<p/>')
                      .appendTo('#submit-div').text(file.name);
                  });
                  data.context = $('<button/>').text('Upload')
                    .addClass('btn')
                    .addClass('btn-default')
                    .appendTo('#submit-div')
                    .click(function() {
                      data.submit();
                    });
                },
                progressall: function (e, data) {
                    /*jshint unused:false*/
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    if (!settings.editor) {$progress.find('div.js-progress').css({'position': 'absolute', 'top': '40px'}); }
                    if (settings.progressbar) {
                        $upload_button.trigger('uploadprogress', [progress, data]);
                        $progress.find('.js-upload-progress-bar').css('width', progress + '%');
                    }
                },
                fail: function (e, data) {
                    /*jshint unused:false*/
                    Ember.Logger.log("failed upload!");
                    Ember.Logger.log(e);
                    Ember.Logger.log(data);
                    $('.js-button-accept').prop('disabled', false);
                    $upload_button.trigger('uploadfailure', [data.result]);
                    $upload_button.find('.js-upload-progress-bar').addClass('fail');
                    if (data.jqXHR.status === 413) {
                        $upload_button.find('div.js-fail').text('The image you uploaded was larger than the maximum file size your server allows.');
                    } else if (data.jqXHR.status === 415) {
                        $upload_button.find('div.js-fail').text('The image type you uploaded is not supported. Please use .PNG, .JPG, .GIF, .SVG.');
                    } else {
                        $upload_button.find('div.js-fail').text('Something went wrong :(');
                    }
                    $upload_button.find('div.js-fail, button.js-fail').fadeIn(1500);
                    $upload_button.find('button.js-fail').on('click', function () {
                        $upload_button.css({minHeight: 0});
                        $upload_button.find('div.description').show();
                        self.removeExtras();
                        self.init();
                    });
                },
                done: function (e, data) {
                    /*jshint unused:false*/
                    Ember.Logger.log("done!");
                    self.complete(data.result);
                }
            });
        },

//         buildExtras: function () {
//             if (!$upload_button.find('span.media')[0]) {
//                 $upload_button.prepend('<span class="media"><span class="hidden">Image Upload</span></span>');
//             }
//             if (!$upload_button.find('div.description')[0]) {
//                 $upload_button.append('<div class="description">Add image</div>');
//             }
//             if (!$upload_button.find('div.js-fail')[0]) {
//                 $upload_button.append('<div class="js-fail failed" style="display: none">Something went wrong :(</div>');
//             }
//             if (!$upload_button.find('button.js-fail')[0]) {
//                 $upload_button.append('<button class="js-fail btn btn-green" style="display: none">Try Again</button>');
//             }
//             if (!$upload_button.find('a.image-url')[0]) {
//                 $upload_button.append('<a class="image-url" title="Add image from URL"><span class="hidden">URL</span></a>');
//             }
// //                if (!$upload_button.find('a.image-webcam')[0]) {
// //                    $upload_button.append('<a class="image-webcam" title="Add image from webcam"><span class="hidden">Webcam</span></a>');
// //                }
//         },

        // removeExtras: function () {
        //     $upload_button.find('span.media, div.js-upload-progress, a.image-url, a.image-upload, a.image-webcam, div.js-fail, button.js-fail, a.js-cancel').remove();
        // },

        init: function () {
            var self = this;
            //This is the start point if no image exists
            // $upload_button.find('img.js-upload-target').css({'display': 'none'});
            // $upload_button.removeClass('pre-image-uploader image-uploader-url').addClass('image-uploader');
            // this.removeExtras();
            // this.buildExtras();
            this.bindFileUpload();
            if (!settings.fileStorage) {
                self.initUrl();
                return;
            }
            $upload_button.find('a.image-url').on('click', function () {
                self.initUrl();
            });
        },
        initUrl: function () {
            var self = this, val;
            if (settings.fileStorage) {
                $upload_button.append($cancel);
            }
            $upload_button.find('.js-cancel').on('click', function () {
                $upload_button.find('.js-url').remove();
                $upload_button.find('.js-fileupload').removeClass('right');
                self.removeExtras();
                self.initWithupload_button();
            });

            $upload_button.find('div.description').before($url);

            if (settings.editor) {
                $upload_button.find('div.js-url').append('<button class="btn btn-blue js-button-accept">Save</button>');
            }

            $upload_button.find('.js-button-accept').on('click', function () {
                val = $upload_button.find('.js-upload-url').val();
                $upload_button.find('div.description').hide();
                $upload_button.find('.js-fileupload').removeClass('right');
                $upload_button.find('.js-url').remove();
                if (val === '') {
                    $upload_button.trigger('uploadsuccess', 'http://');
                    self.initWithupload_button();
                } else {
                    self.complete(val);
                }
            });

            // Only show the toggle icon if there is a upload_button mode to go back to
            if (settings.fileStorage !== false) {
                $upload_button.append('<a class="image-upload" title="Add image"><span class="hidden">Upload</span></a>');
            }

            $upload_button.find('a.image-upload').on('click', function () {
                $upload_button.find('.js-url').remove();
                $upload_button.find('.js-fileupload').removeClass('right');
                self.initWithupload_button();
            });

        },
    });
};


pdfUpload = function (options) {
    var settings = $.extend({
        progressbar: true,
        editor: false,
        fileStorage: true
    }, options);
    return this.each(function () {
        var $upload_button = $(this),
            ui;

        ui = new UploadUi($upload_button, settings);
        ui.init();
    });
};

export default pdfUpload;
