import ghostPaths from 'ghost/utils/ghost-paths';

var UploadUi,
    pdfUpload,
    Ghost = ghostPaths();

UploadUi = function ($upload_button, settings) {
    var $cancel = '<button class="btn btn-default btn-red js-cancel" title="Delete"><span class="hidden">Delete</span></button>',
        $progress =  $('<div />', {
            'class' : 'js-upload-progress progress progress-success active',
            'role': 'progressbar',
            'aria-valuemin': '0',
            'aria-valuemax': '100'
        }).append($('<div />', {
            'class': 'js-upload-progress-bar bar',
            'style': 'width: 0%'
        }));

    $.extend(this, {
        complete: function (result) {
          $upload_button.trigger('uploadsuccess', [result]);
        },

        bindFileUpload: function () {
            var self = this;

            $upload_button.find('.js-fileupload').fileupload().fileupload('option', {
                url: Ghost.apiRoot + '/uploads/pdf',
                add: function (e, data) {
                  /*jshint unused:false*/
                  $('.js-upload-button').prop('disabled', true);
                  data.submit();

                  // $.each(data.files, function(index, file) {
                  //   var node = $('<p/>')
                  //     .appendTo('#submit-div').text(file.name);
                  // });
                  // data.context = $('<button/>').text('Upload')
                  //   .addClass('btn')
                  //   .addClass('btn-default')
                  //   .appendTo('#submit-div')
                  //   .click(function() {
                  //     data.submit();
                  //   });
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
                    self.complete(data.result);
                }
            });
        },

        init: function () {
            var self = this;
            this.bindFileUpload();
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
