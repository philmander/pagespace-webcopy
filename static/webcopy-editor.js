(function() {
    var STORAGE_KEY = 'pagespace-webcopy-html';

    angular.module('webCopyApp', [ 'ngSanitize' ])
    .directive('psWysihtml', function () {

        return {
            restrict: 'A',
            link: function (scope, element) {

                localforage.getItem(STORAGE_KEY).then(function(cachedHtml) {
                    pagespace.getData().then(function(data) {
                        if(cachedHtml) {
                            data.html = cachedHtml;
                        }
                        if(data.cssHref) {
                            var injectLink = document.createElement('link');
                            injectLink.setAttribute('type', 'text/css');
                            injectLink.setAttribute('rel', 'stylesheet');
                            injectLink.setAttribute('href', data.cssHref);
                            var head = document.getElementsByTagName("head")[0];
                            head.appendChild(injectLink);
                        }
                        scope.data = data;
                        scope.$apply();
                        setupEditor();
                    });
                });

                function setupEditor() {
                    var editorEl = element[0].querySelector('.editor');
                    var sourceEl = element[0].querySelector('.source');
                    var toolbarEl = element[0].querySelector('.toolbar');

                    angular.element(sourceEl).addClass('hidden');

                    var editor = new wysihtml5.Editor(editorEl, {
                        toolbar: toolbarEl,
                        showToolbarAfterInit: false,
                        parserRules:  wysihtml5ParserRules,
                        cleanUp: false,
                        useLineBreaks:  false
                    });
                    scope.webcopy = editor.getValue();

                    scope.insertImage = function(image) {
                        var imageData = {
                            src: image.src,
                            alt: image.name || ""
                        };
                        if(image.width) {
                            imageData.width = image.width;
                        }
                        if(image.height) {
                            imageData.height = image.height;
                        }

                        editor.composer.commands.exec("insertImage", imageData);
                        scope.insertImageDialog = false;
                        scope.selectedImage = {};
                    };

                    element[0].querySelector('[data-behavior=showSource]').addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var textarea = sourceEl.getElementsByTagName('textarea')[0];
                        var html;
                        if(angular.element(sourceEl).hasClass('hidden')) {
                            //show textarea
                            html = editor.getValue();
                            angular.element(textarea).val(html);
                        } else {
                            // show editor
                            html = angular.element(textarea).val();
                            editor.setValue(html);
                        }

                        angular.element(editorEl).toggleClass('hidden');
                        angular.element(sourceEl).toggleClass('hidden');
                    });

                    editor.on("focus", function() {
                        angular.element(toolbarEl).removeClass('hidden');
                    });
                    /*            editor.on("blur", function() {
                     angular.element(toolbarEl).addClass('hidden');
                     });*/
                    editor.on("interaction", function() {
                        scope.webcopy = editor.getValue();
                        scope.changed = true;
                    });
                    editor.on("aftercommand", function() {
                        scope.changed = true;
                    });
                }
            }
        }
    })
    .directive('psImageDialog', function() {
        return {
            restrict: 'A',
            controller: function($scope, $http) {
                $http.get('/_api/media?type=' + encodeURIComponent('/^image/')).success(function(images) {
                    images = images.map(function(image) {
                        image.src = '/_media/' + image.fileName;
                        return image;
                    });
                    $scope.availableImages = images;
                });

                $scope.selectedImage = {};
                $scope.selectImage = function(image) {
                    $scope.selectedImage = image;
                };

                $scope.hideInsertImage = function() {
                    $scope.selectedImage = {};
                    $scope.insertImageDialog = false;
                }
            }
        }
    })
    .controller('WebCopyController' , function($scope) {

        //image dialog stuff
        $scope.insertImageDialog = false;
        $scope.showInsertImage = function() {
            $scope.insertImageDialog = true;
        };

        $scope.changed = false;

        $scope.save = function() {
            var htmlVal = $scope.webcopy;
            return pagespace.setData({
                wrapperClass: $scope.data.wrapperClass || '',
                cssHref: $scope.data.cssHref,
                html: htmlVal
            }).then(function() {
                //remove draft
                return localforage.removeItem(STORAGE_KEY);
            }).then(function() {
                pagespace.close();
            });
        };

        $scope.saveDraft = function() {
            var htmlVal = $scope.webcopy;
            return localforage.setItem(STORAGE_KEY, htmlVal);
        };

         function saveOnChange() {
             setTimeout(function() {
                 if($scope.changed) {
                     $scope.saveDraft().then(function() {
                         console.info('Draft saved');
                         $scope.changed = false;
                         saveOnChange();
                     }).catch(function(err) {
                         console.error(err, 'Error saving draft');
                     });
                 } else {
                     saveOnChange();
                 }
             }, 500);
         }
         saveOnChange();
    });
})();