// Ionic Quiz App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'quiz' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

var stack = new Array(),
    collectionChildrenIds = new Array(),
    collectionPath = new Array(),
    collectionPathMap = {},
    content = {},
    collectionChildren = true,
    defaultMetadata = { "identifier": "org.ekstep.item.sample", "mimeType": "application/vnd.ekstep.ecml-archive", "name": "Content Preview ", "author": "EkStep", "localData": { "questionnaire": null, "appIcon": "fixture-stories/item_sample/logo.png", "subject": "literacy_v2", "description": "Ekstep Content App", "name": "Content Preview ", "downloadUrl": "", "checksum": null, "loadingMessage": "Without requirements or design, programming is the art of adding bugs to an empty text file. ...", "concepts": [{ "identifier": "LO1", "name": "Receptive Vocabulary", "objectType": "Concept" }], "identifier": "org.ekstep.item.sample", "grayScaleAppIcon": null, "pkgVersion": 1 }, "isAvailable": true, "path": "fixture-stories/item_sample" },
    config = {
        showStartPage: true,
        showEndPage: true,
        showHTMLPages: true
    },
    isbrowserpreview = getUrlParameter("webview"),
    isMobile = window.cordova ? true : false,
    setContentDataCb = undefined;

// TODO:have to remove appState and setContentDataCb in future.
// Used in only Authoting tools
window.setContentData = function(metadata, data, configuration) {
    if(_.isUndefined(metadata) || _.isNull(metadata)){
        content.metadata = defaultMetadata
    }else{
        content.metadata = metadata;
    }
    if (!_.isUndefined(data)) {
        content.body = data;
    }
    _.map(configuration, function(val, key) {
        config[key] = val;
    });
    if (!config.showHTMLPages) {
        config.showEndPage = false;
    }
    localStorage.clear();
    var $state = angular.element(document.body).injector().get('$state')
    updateContentData($state);
}

function updateContentData($state) {
    if (_.isUndefined($state)) {
        console.warn("updateContentData($state) - $state is not defined.");
        return;
    }
    if (content && content.metadata) {
        if (!content.metadata.identifier) {
            console.error("Content Id is missing. Sending default Id for TelemetryService init.");
        }
        var contentId = content.metadata.identifier || defaultMetadata.identifier;
        $state.go('playContent', {
            'itemId': contentId
        });
    }
}


function getContentObj(data) {
    if (_.isObject(data.body))
        return data.body;
    var tempData = data;
    var x2js = new X2JS({ attributePrefix: 'none' });
    data = x2js.xml_str2json(tempData.body);
    if (!data || data.parsererror)
        data = JSON.parse(tempData.body)
    return data;
}

function launchInitialPage(appInfo, $state) {
    // Collection Mimetype check for the launching of the localdevlopment
    if (CONTENT_MIMETYPES.indexOf(appInfo.mimeType) > -1) {
        $state.go('playContent', {
            'itemId': GlobalContext.game.id
        });
    } else if ((COLLECTION_MIMETYPE == appInfo.mimeType) ||
        (ANDROID_PKG_MIMETYPE == appInfo.mimeType && appInfo.code == packageName)) {
        if (!isbrowserpreview) {
            // only for the LocalDevelopment we are showing the collection list 
            $state.go('contentList', {
                "id": GlobalContext.game.id
            });
        }else{
            console.log("SORRY COLLECTION PREVIEW IS NOT AVAILABEL");
        }
    }
}

//Handling the logerror event from the Telemetry.js
document.body.addEventListener("logError", telemetryError, false);
function telemetryError(e) {
    var $body = angular.element(document.body); 
    var $rootScope = $body.scope().$root;
    document.body.removeEventListener("logError");
}

angular.module('genie-canvas', ['ionic', 'ngCordova', 'genie-canvas.services'])
    .constant("appConstants", {
        "contentId": "contentId",
        "stateContentList": "contentList",
        "stateShowContent": "showContent",
        "statePlayContent": "playContent",
        "stateShowContentEnd": "showContentEnd"
    })
    .run(function($rootScope, $ionicPlatform, $location, $timeout, $state, $stateParams, appConstants, ContentService) {

        $rootScope.imageBasePath = "img/icons/";
        $rootScope.enableEval = false;
        // serverPath and localPreview is a global variable defined in index.html file inside a story
        if ("undefined" != typeof localPreview && "local" == localPreview)
            $rootScope.imageBasePath = serverPath + $rootScope.imageBasePath;
        $rootScope.languageSupport = {
            "languageCode": "en",
            "home": "Home",
            "title": "TITLE",
            "submit": "SUBMIT",
            "image": "Image",
            "voice": "Voice",
            "audio": "Audio",
            "author": "Author",
            "instructions": "NOTES TO TEACHER",
            "replay": "Replay",
            "feedback": "Feedback",
            "collection": "COLLECTION",
            "noCreditsAvailable": "There are no credits available",
            "congratulations": "Congratulations! You just completed",
            "credit": "Credits",
            "next": "Next",
            "scores": "SCORES AND RATING",
            "lastPage": "GO TO LAST PAGE",
            "nextContent": "NEXT CONTENT",
            "comment": "write your comment..."
        }

        $rootScope.safeApply = function(fn) {
            var phase = this.$root.$$phase;
            if (phase == '$apply' || phase == '$digest') {
                if (fn && (typeof(fn) === 'function')) {
                    fn();
                }
            } else {
                this.$apply(fn);
            }
        }

        $timeout(function() {
            $ionicPlatform.ready(function() {
                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                //appState = $state;

                console.log('ionic platform is ready...');
                if ("undefined" == typeof Promise) {
                    alert("Your device isn’t compatible with this version of Genie.");
                    exitApp();
                }
                if (window.cordova && window.cordova.plugins.Keyboard) {
                    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                } else {
                    AppConfig.recorder = "android";
                }
                if (window.StatusBar) {
                    StatusBar.styleDefault();
                }

                $ionicPlatform.onHardwareBackButton(function() {
                    backbuttonPressed($rootScope.pageId);
                });
                $ionicPlatform.on("pause", function() {
                    Renderer.pause();
                });
                $ionicPlatform.on("resume", function() {
                    Renderer.resume();
                });
                $rootScope.getContentMetadata = function(id, cb) {
                    ContentService.getContent(id)
                        .then(function(data) {
                            $rootScope.setContentMetadata(data);
                            if (!_.isUndefined(cb)) {
                                cb();
                            }
                        })
                        .catch(function(err) {
                            console.info("contentNotAvailable : ", err);
                            contentNotAvailable();
                        });
                };
                $rootScope.getDataforPortal = function(id) {
                    ContentService.getContentMetadata(id)
                        .then(function(data) {
                           $rootScope.setContentMetadata(data);
                        })
                        .catch(function(err) {
                            console.info("contentNotAvailable : ", err);
                            contentNotAvailable();
                        });
                };
                $rootScope.setContentMetadata = function(contentData) {
                    var data = _.clone(contentData);
                    content["metadata"] = data;
                    GlobalContext.currentContentId = data.identifier;
                    GlobalContext.currentContentMimeType = data.mimeType;
                    if (_.isUndefined(data.localData)) {
                        data.localData = _.clone(contentData);
                    } else {
                        data = data.localData;
                    }
                    $rootScope.safeApply(function() {
                        $rootScope.content = data;
                    });
                    
                };
                $rootScope.getContentBody = function(id) {
                    ContentService.getContentBody(id)
                        .then(function(data) {
                            content["body"] = data.body;
                            launchInitialPage(content.metadata, $state);

                        })
                        .catch(function(err) {
                            console.info("contentNotAvailable : ", err);
                            contentNotAvailable();
                        });
                };
                $rootScope.deviceRendrer = function() {
                    if ($state.current.name == appConstants.stateShowContentEnd) {
                        $rootScope.$broadcast("loadEndPage");
                    } else {
                        if (isMobile) {
                            $rootScope.getContentMetadata(GlobalContext.game.id, function() {
                                $state.go('playContent', {'itemId': $rootScope.content.identifier});
                            });
                        } else {
                            launchInitialPage(GlobalContext.config.appInfo, $state);
                        }
                    }
                };
                genieservice.getMetaData().then(function(data) {
                    var flavor = data.flavor;
                    if (AppConfig[flavor] == undefined)
                        flavor = "sandbox";
                    GlobalContext.config.flavor = flavor;
                });
                GlobalContext.init(packageName, version).then(function(appInfo) {
                    if ("undefined" != typeof localPreview && "local" == localPreview)
                        return;
                    if (isbrowserpreview) {
                        var urlContentId = getUrlParameter("id");
                        genieservice.api.setBaseUrl(AppConfig[AppConfig.flavor]);
                        if (urlContentId) {
                            $rootScope.getDataforPortal(urlContentId);
                            $rootScope.getContentBody(urlContentId);
                        }
                    } else {
                        localStorageGC.setItem("collection", GlobalContext.game.collection);
                        $rootScope.deviceRendrer();
                    }
                }).catch(function(res) {
                    console.log("Error Globalcontext.init:", res);
                    alert(res.errors);
                    exitApp();
                });
            });

        });

    }).config(function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('contentList', {
                cache: false,
                url: "/content/list/:id",
                templateUrl: "templates/content-list.html",
                controller: 'ContentListCtrl'
            })
            .state('showContentEnd', {
                cache: false,
                url: "/content/end/:contentId",
                templateUrl: "templates/end.html",
                controller: 'EndPageCtrl'
            })
            .state('playContent', {
                cache: false,
                url: "/play/content/:itemId",
                templateUrl: "templates/renderer.html",
                controller: 'ContentCtrl'
            })

    }).controller('BaseCtrl', function($scope, $rootScope, $state, $stateParams, ContentService, appConstants) {
        $rootScope.replayContent = function() {
            if (!$rootScope.content) {
                $rootScope.getContentMetadata($stateParams.itemId);
            }
            startProgressBar(40, 0.6,$rootScope.content.name);
            TelemetryService.interact("TOUCH", "gc_replay", "TOUCH", {
                stageId: ($rootScope.pageId == "endpage" ? "endpage" : $rootScope.stageData.currentStage)
            });
            EventBus.dispatch('actionReplay');
            if ($state.current.name == appConstants.stateShowContentEnd) {
                $state.go(appConstants.statePlayContent, {
                    'itemId': $rootScope.content.identifier
                });
            } else {
                Renderer.theme.removeHtmlElements();
                Renderer.theme.reRender();
            }
        }
    }).controller('ContentListCtrl', function($scope, $rootScope, $state, $stateParams, ContentService) {
        // This will be appear only for the localdevlopment 
        $rootScope.pageId = 'ContentApp-Collection';
        $scope.version = GlobalContext.game.ver;
        $scope.flavor = GlobalContext.config.flavor;
        $scope.currentUser = GlobalContext.user;
        $rootScope.stories = [];
        $rootScope.showMessage = false;

        $rootScope.$on('show-message', function(event, data) {
            if (data.message && data.message != '') {
                $rootScope.$apply(function() {
                    $rootScope.showMessage = true;
                    $rootScope.message = data.message;
                });
            }
            if (data.timeout) {
                setTimeout(function() {
                    $rootScope.$apply(function() {
                        $rootScope.showMessage = false;
                    });
                    if (data.callback) {
                        data.callback();
                    }
                }, data.timeout);
            }
        });

        $rootScope.renderMessage = function(message, timeout, reload) {
            $rootScope.$broadcast('show-message', {
                "message": message,
                "timeout": timeout
            });
        }

        $scope.resetContentListCache = function() {
            jQuery('#loading').hide();
            var collectionContentId = $stateParams.id;
            $rootScope.renderMessage("", 0);
            ContentService.getContent(collectionContentId)
                .then(function(content) {
                    GlobalContext.previousContentId = content.identifier;
                    if (!_.findWhere(collectionPath, { identifier: collectionContentId }))
                        collectionPath.push({ identifier: content.identifier, mediaType: "Collection" });

                    if (collectionPathMap[content.identifier]) {
                        var pathArr = collectionPathMap[content.identifier];
                        if (pathArr[pathArr.length - 1].mediaType.toLowerCase() == "content") {
                            collectionPath = pathArr;
                            collectionPath.pop()
                        } else {
                            collectionPath = pathArr;
                        }
                    }

                    if (!_.contains(stack, content.identifier))
                        stack.push(content.identifier);
                    if (COLLECTION_MIMETYPE == content.mimeType) {
                        $rootScope.title = content.name;
                        $rootScope.collection = content;
                        localStorageGC.setItem("collection", $rootScope.collection);
                        TelemetryService.start(content.identifier, content.pkgVersion);
                    } else {
                        $rootScope.collection = {};
                    }
                    var childrenIds = (content.children) ? _.pluck(_.sortBy(content.children, function(child) {
                        return child.index;
                    }), "identifier") : null;
                    if (childrenIds)
                        collectionChildrenIds = childrenIds;
                    collectionChildren = true;
                    var filter = (content.filter) ? JSON.parse(content.filter) : content.filter;
                    return ContentService.getContentList(filter, childrenIds);
                })
                .then(function(result) {
                    $rootScope.$apply(function() {
                        $rootScope.stories = result;
                    });
                    if ($rootScope.stories && $rootScope.stories.length <= 0) {
                        $rootScope.renderMessage(AppMessages.NO_CONTENT_LIST_FOUND);
                    }
                })
                .catch(function(err) {
                    $rootScope.$apply(function() {
                        $rootScope.stories = [];
                    });
                    console.error(err);
                    $rootScope.renderMessage(AppMessages.ERR_GET_CONTENT_LIST, 3000);
                });
        };

        $scope.playContent = function(content) {
            $rootScope.content = content;
            if (content.mimeType == COLLECTION_MIMETYPE) {
                console.info("collection nat handled")
            } else {
                GlobalContext.currentContentId = content.identifier;
                GlobalContext.currentContentMimeType = content.mimeType;
                collectionPath.push({
                    identifier: content.identifier,
                    mediaType: "Content"
                });
                $state.go('playContent', {
                    'itemId': content.identifier
                });
            }
        };
        $scope.simulateCrash = function(fatal) {
            if (navigator.crashlytics) {
                if (fatal === true) {
                    console.log("Simulating fatal crash for Crashlytics");
                    navigator.crashlytics.simulateCrash("Simulated crash");
                } else {
                    console.log("Simulating non-fatal error for Crashlytics");
                    navigator.crashlytics.logException("Simulated non-fatal error");
                }
                console.log("Simulation sent to Crashlytics");
            } else {
                console.log("Crashlytics not available for reporting");
            }
        };

        $scope.exitApp = function() {
            exitApp();
        };
        $scope.init = function(){
            $rootScope.title = GlobalContext.config.appInfo ? GlobalContext.config.appInfo.name : "";
            $scope.resetContentListCache();
        };

        $scope.init();

    }).controller('ContentCtrl', function($scope, $rootScope, $state, $stateParams, ContentService) {
        $rootScope.pageId = "renderer";
        $scope.init = function() {
            if (_.isUndefined($rootScope.content)) {
                if (!_.isEmpty(content)) {
                    $rootScope.content = content.metadata;
                    $scope.renderContent();
                }
            } else {
                $scope.renderContent();
            }
        }
        $scope.callStartTelemetry = function(content) {
            var identifier = (content && content.identifier) ? content.identifier : null;
            var pkgVersion = !_.isUndefined(content.pkgVersion) ? content.pkgVersion.toString() : null;
            var version = (content && pkgVersion) ? pkgVersion : "1";
            startTelemetry(identifier, version);
        }
        $scope.renderContent = function(){
            if ($stateParams.itemId && $rootScope.content) {
                localStorageGC.setItem("content", $rootScope.content);
                startProgressBar(40, 0.6, $rootScope.content.name);
                $scope.callStartTelemetry($rootScope.content);
                $scope.item = $rootScope.content;
                if ($scope.item && $scope.item.mimeType && $scope.item.mimeType == 'application/vnd.ekstep.html-archive') {
                    var isMobile = window.cordova ? true : false;

                    // For HTML content, lunach eve is required
                    // setting launch evironment as "app"/"portal" for "mobile"/"portal(web)"
                    var envHTML = isMobile ? "app" : "portal";

                    var launchData = {"env": envHTML, "envpath": AppConfig[AppConfig.flavor]};
                    //Adding contentId and LaunchData as query parameter

                    var prefix_url = isbrowserpreview ? getAsseturl($rootScope.content) : $scope.item.baseDir;

                    var path = prefix_url + '/index.html?contentId=' + $stateParams.itemId + '&launchData=' + JSON.stringify(launchData) + "&appInfo=" + JSON.stringify(GlobalContext.config.appInfo);

                    //Adding config as query parameter for HTML content
                    if($scope.item.config){
                        path += "&config=" + JSON.stringify($scope.item.config);
                    }

                    // Adding Flavor(environment) as query parameter to identify HTML content showing in dev/qa/prdocution
                    // For local development of HTML flavor should not sent in URL
                    // adding time to aviod browser catch of HTML page
                    if(isbrowserpreview){
                        path += "&flavor=" + AppConfig.flavor + "t=" + getTime();
                    }

                    if (isMobile) {
                        console.log("Opening through cordova custom webview.");
                        cordova.InAppBrowser.open(path, '_self', 'location=no,hardwareback=no');
                    } else {
                        console.log("Opening through window.open");
                        window.open(path, '_self');
                    }
                } else {
                     if (isbrowserpreview) {
                        var contentBody = undefined;
                        Renderer.start("", 'gameCanvas', $scope.item, getContentObj(content), true);
                    } else
                    if (!_.isUndefined($scope.item)) {
                        Renderer.start($scope.item.baseDir, 'gameCanvas', $scope.item);
                    } else {
                        console.warn("Content not found")
                    }
                }
            } else {
                alert('Name or Launch URL not found.');
                 exitApp();
            } 

        }
        $scope.gotToEndPage = function() {
            $state.go('showEndPage', {});
        }

        $scope.reloadStage = function() {
            reloadStage();
        }

        $scope.$on('$destroy', function() {
        })
        $rootScope.showMessage = false;
        $rootScope.$on('show-message', function(event, data) {
            if (data.message && data.message != '') {
                $rootScope.$apply(function() {
                    $rootScope.showMessage = true;
                    $rootScope.message = data.message;
                });
            }
            if (data) {
                setTimeout(function() {
                    $rootScope.$apply(function() {
                        $rootScope.showMessage = false;
                    });
                }, 5000);
            }
        });

        // This is to fix FTB preview issue of causing by Ionic and Angular combination
        // childnodes error causing by ionic framework whiel rendering FTB item
        // reference: http://stackoverflow.com/questions/27776174/type-error-cannot-read-property-childnodes-of-undefined
        setTimeout(function() {
            $scope.init();
        },0);
        

    }).controller('EndPageCtrl', function($scope, $rootScope, $state, ContentService, $stateParams) {
        $scope.showFeedbackArea = true;
        $scope.commentModel = '';
        $scope.showFeedbackPopup = false;
        $scope.userRating = 0;
        $scope.popUserRating = 0;
        $scope.stringLeft = 130;
        $scope.selectedRating = 0;
        $rootScope.pageId = "endpage";
        $scope.creditsBody = '<div class="gc-popup-new credit-popup"><div class="gc-popup-title-new"> {{languageSupport.credit}}</div> <div class="gc-popup-body-new"><div class="font-baloo credit-body-icon-font"><div class="content-noCredits" ng-show="content.imageCredits == null && content.voiceCredits == null && content.soundCredits == null">{{languageSupport.noCreditsAvailable}}</div><table style="width:100%; table-layout: fixed;"><tr ng-hide="content.imageCredits==null"><td class="credits-title">{{languageSupport.image}}</td><td class="credits-data">{{content.imageCredits}}</td></tr><tr ng-hide="content.voiceCredits==null"><td class="credits-title">{{languageSupport.voice}}</td><td class="credits-data">{{content.voiceCredits}}</td></tr><tr ng-hide="content.soundCredits==null"><td class="credits-title">{{languageSupport.audio}}</td><td class="credits-data">{{content.soundCredits}}</td></tr></table></div></div></div>';

        $scope.arrayToString = function(array) {
            return (_.isString(array)) ? array : (!_.isEmpty(array) && _.isArray(array)) ? array.join(", ") : "";
        };

        $scope.setCredits = function(key) {
            if ($scope.content[key]) {
                $scope.content[key] = $scope.arrayToString($scope.content[key]);
            } else {
                $scope.content[key] = null;
            }
        };

        $scope.showCredits = function(key) {
            if ($scope.content.imageCredits == null && $scope.content.voiceCredits == null && $scope.content.soundCredits == null) {
                console.warn("No metadata imageCredits,voiceCredites and soundCredits");
            }
            jQuery("#creditsPopup").show();
            TelemetryService.interact("TOUCH", "gc_credit", "TOUCH", {
                stageId: "ContentApp-CreditsScreen",
                subtype: "ContentID"
            });
        }

        $scope.showFeedback = function(param) {
            $scope.userRating = param;
            $scope.popUserRating = param;
            TelemetryService.interact("TOUCH", "gc_feedback", "TOUCH", {
                stageId: "ContnetApp-FeedbackScreen",
                subtype: "ContentID"
            });
            $scope.showFeedbackPopup = true;
            $scope.enableFeedbackSubmit();
        }

        $scope.updatePopUserRating = function(param) {
            $scope.popUserRating = param;
            $scope.enableFeedbackSubmit();
        }

        $scope.enableFeedbackSubmit = function() {
            if ($scope.popUserRating > 0 || $scope.stringLeft < 130)
                jQuery('#feedbackSubmitBtn').removeClass('icon-opacity');
            else
                jQuery('#feedbackSubmitBtn').addClass('icon-opacity');
        }

        $scope.submitFeedback = function() {
            $scope.userRating = $scope.popUserRating;
            $scope.selectedRating = $scope.userRating;
            $scope.hideFeedback();
            var eks = {
                type: "RATING",
                rating: $scope.userRating,
                context: {
                    type: "Content",
                    id: $rootScope.content.identifier,
                    stageid: $rootScope.pageId
                },
                comments: jQuery('#commentText').val()
            }
            TelemetryService.sendFeedback(eks);
        }

        $scope.hideFeedback = function() {
            $scope.showFeedbackPopup = false;
            $scope.stringLeft = 130;
            $scope.userRating = $scope.selectedRating;
        }
        $scope.setTotalTimeSpent = function() {
            var startTime = (TelemetryService && TelemetryService.instance && TelemetryService.instance._end[TelemetryService.instance._end.length - 1]) ? TelemetryService.instance._end[TelemetryService.instance._end.length - 1].startTime : 0;
            if (startTime) {
                var totalTime = Math.round((new Date().getTime() - startTime) / 1000);
                var mm = Math.floor(totalTime / 60);
                var ss = Math.floor(totalTime % 60);
                $scope.totalTimeSpent = (mm > 9 ? mm : ("0" + mm)) + ":" + (ss > 9 ? ss : ("0" + ss));
            } else {
                $scope.showFeedbackArea = false;
            }
        }

        $scope.getTotalScore = function(id) {
            if ("undefined" != typeof cordova) {
                ContentService.getLearnerAssessment(TelemetryService._user.uid, id)
                    .then(function(score) {
                        if (score && score.total_questions) {
                            $scope.showScore = true;
                            $scope.$apply(function() {
                                $scope.totalScore = (score.total_correct + "/" + score.total_questions);
                            });
                        } else {
                            $scope.showScore = false
                        }
                    })
            } else {
                $scope.showScore = false
            }
        }

        $scope.commentLength = function() {
            if ($('#commentText').val().length > 130)
                $('#commentText').val($('#commentText').val().slice(0, 130));
            $scope.stringLeft = 130 - $('#commentText').val().length;
            $scope.enableFeedbackSubmit();
        }

        $scope.init = function() {
            if (_.isUndefined($rootScope.content)) {
                localStorageGC.update();
                // Updating the current content object by getting from localStage
                content = localStorageGC.getItem('content');
                $rootScope.content = content;
            }
            if(_(TelemetryService.instance).isUndefined()){
                 var tsObj = localStorageGC.getItem('telemetryService');
                 TelemetryService.init(tsObj._gameData, tsObj._user);
            }

            TelemetryService.interact("TOUCH", $stateParams.contentId, "TOUCH", { stageId: "ContentApp-EndScreen", subtype: "ContentID" });

            // Get related contents for the current content
            $scope.$broadcast('getRelatedContentEvent');

            var creditsPopup = angular.element(jQuery("popup[id='creditsPopup']"));
            creditsPopup.trigger("popupUpdate", { "content": $rootScope.content });
            setTimeout(function() {
                $rootScope.$apply();
            }, 1000);
            $scope.setCredits('imageCredits');
            $scope.setCredits('soundCredits');
            $scope.setCredits('voiceCredits');
            window.addEventListener('native.keyboardshow', epKeyboardShowHandler, true);
            window.addEventListener('native.keyboardhide', epKeyboardHideHandler, true);
            jQuery('#loading').hide();
            $scope.setTotalTimeSpent();
            $scope.getTotalScore($stateParams.contentId);
            $scope.showFeedback(0);
        }

        function epKeyboardShowHandler() {
            jQuery('#gcFbPopup').addClass('gc-fc-popup-keyboard');
        }

        function epKeyboardHideHandler() {
            jQuery('#gcFbPopup').removeClass('gc-fc-popup-keyboard');
        }

        setTimeout(function() {
            $scope.init();
        }, 0);

        $rootScope.$on('loadEndPage', function() {
            if (_.isUndefined($rootScope.content)) {
                $scope.init();
            }
        });
    }).controller('OverlayCtrl', function($scope, $rootScope, $stateParams) {
        $rootScope.isItemScene = false;
        $rootScope.menuOpened = false;

        EventBus.addEventListener("sceneEnter", function(data) {
            $rootScope.stageData = data.target;

            //TODO: Remove this currentStage parameter and use directly stageData._currentStage
            $rootScope.stageData.currentStage = $rootScope.stageData._id;
        });

        $scope.state_off = "off";
        $scope.state_on = "on";
        $scope.state_disable = "disable";

        $scope.showOverlayNext = true;
        $scope.showOverlayPrevious = true;
        $scope.showOverlaySubmit = false;
        $scope.showOverlayGoodJob = false;
        $scope.showOverlayTryAgain = false;
        $scope.overlayEvents = ["overlayNext", "overlayPrevious", "overlaySubmit", "overlayMenu", "overlayReload", "overlayGoodJob", "overlayTryAgain"];

        $rootScope.defaultSubmit = function() {
            EventBus.dispatch("actionDefaultSubmit");
        }

        $scope.navigate = function (navType) {
            if (!$rootScope.content) {
                // if $rootScope.content is not available get it from the base controller
                $rootScope.getContentMetadata($stateParams.itemId);
            }

            TelemetryService.interact("TOUCH", navType, null, {stageId : $rootScope.stageData.currentStage});
            GlobalContext.currentContentId = $rootScope.content.identifier;
            GlobalContext.currentContentMimeType = $rootScope.content.mimeType;
            if (navType === "next") {
                EventBus.dispatch("actionNavigateNext", navType);
            } else if (navType === "previous") {
                EventBus.dispatch("actionNavigatePrevious", navType);
            }
        }

        $scope.init = function() {
            if (GlobalContext.config.language_info) {
                console.log("Language updated", GlobalContext.config.language_info);
                var languageInfo = JSON.parse(GlobalContext.config.language_info);
                for (key in languageInfo) {
                    $rootScope.languageSupport[key] = languageInfo[key];
                }
            }

            var evtLenth = $scope.overlayEvents.length;
            for (i = 0; i < evtLenth; i++) {
                var eventName = $scope.overlayEvents[i];
                EventBus.addEventListener(eventName, $scope.overlayEventHandler, $scope);
            }
        }

        $scope.overlayEventHandler = function(event) {
            // console.log("Event", event);
            //Switch case to handle HTML elements(Next, Previous, Submit, etc..)
            switch (event.type) {
                case "overlayNext":
                    $scope.showOverlayNext = event.target;
                    break;
                case "overlayPrevious":
                    $scope.showOverlayPrevious = event.target;
                    break;
                case "overlaySubmit":
                    if (event.target === "off") {
                        $scope.showOverlaySubmit = false;
                    } else {
                        $scope.showOverlaySubmit = true;
                        (event.target === "disable") ? $rootScope.enableEval = false: $rootScope.enableEval = true;
                    }
                    break;
                case "overlayMenu":
                    break;
                case "overlayReload":
                    break;
                case "overlayGoodJob":
                    $scope.showOverlayGoodJob = event.target;
                    break;
                case "overlayTryAgain":
                    $scope.showOverlayTryAgain = event.target;
                    break;
                default:
                    console.log("Default case got called..");
                    break;
            }

            $rootScope.safeApply();
        }

        $scope.openMenu = function() {

            //display a layer to disable clicking and scrolling on the gameArea while menu is shown

            if (jQuery('.menu-overlay').css('display') == "block") {
                $scope.hideMenu();
                return;
            }

            $scope.menuOpened = true;
            TelemetryService.interact("TOUCH", "gc_menuopen", "TOUCH", {
                stageId: $rootScope.stageData.currentStage
            });
            jQuery('.menu-overlay').css('display', 'block');
            jQuery(".gc-menu").show();
            jQuery(".gc-menu").animate({
                "marginLeft": ["0%", 'easeOutExpo']
            }, 700, function() {});

        }

        $scope.hideMenu = function() {
            $scope.menuOpened = false;
            TelemetryService.interact("TOUCH", "gc_menuclose", "TOUCH", {
                stageId: $rootScope.stageData.currentStage
            });
            jQuery('.menu-overlay').css('display', 'none');
            jQuery(".gc-menu").animate({
                "marginLeft": ["-31%", 'easeOutExpo']
            }, 700, function() {});
        }

        $scope.init();
    }).controller('RelatedContentCtrl', function($scope, $rootScope, $state, $stateParams, ContentService) {
        $scope.showRelatedContent = false;
        $scope.contentShowMore = false;
        $scope.showRelatedContentHeader = true;
        $scope.relatedContents = [];
        $scope.relatedContentPath = [];
   $scope.playRelatedContent = function(content) {
        $scope.showRelatedContent = false;
        $scope.contentShowMore = false;
        $scope.showRelatedContentHeader = false;
        collectionPath = $scope.relatedContentPath;
        TelemetryService.interact("TOUCH", "gc_relatedcontent", "TOUCH", {
            stageId: "endpage",
            subtype: " "
        });
        TelemetryService.end();
        jQuery('#endPageLoader').show();
        GlobalContext.game.id = content.identifier
        GlobalContext.game.pkgVersion = content.pkgVersion;
        if (content.isAvailable) {
            $rootScope.getContentMetadata(GlobalContext.game.id, function() {
                $state.go('playContent', {
                    'itemId': $rootScope.content.identifier
                });
            });
        } else {
            window.open("ekstep://c/" + content.identifier, "_system");
        }
    }

        $scope.getRelatedContent = function(list) {
            ContentService.getRelatedContent(TelemetryService._user.uid, list)
                .then(function(item) {
                    if (!_.isEmpty(item)) {
                        var list = [];
                        if (!_.isEmpty(item.collection)) {
                            $scope.showRelatedContent = true;
                            $scope.relatedContentPath = item.collection;
                            list = [item.collection[item.collection.length - 1]];
                            list[0].appIcon = list[0].path + '/' + list[0].appIcon;
                        } else if (!_.isEmpty(item.content)) {
                            $scope.showRelatedContent = true;
                            $scope.contentShowMore = true;
                            list = _.first(_.isArray(item.content) ? item.content : [item.content], 2);
                        }

                        if (!_.isEmpty(list)) {
                            $scope.$apply(function() {
                                $scope.relatedContents = list;
                                jQuery('#endPageLoader').hide();
                            });
                        } else {
                            $scope.showRelatedContentHeader = false;
                            jQuery('#endPageLoader').hide();
                        }
                    }
                })
        }

        $scope.renderRelatedContent = function(id) {
            var list = [];
            if (_.isUndefined($scope.collectionTree) || $scope.collectionTree.length == 0) {
                if (("undefined" != typeof cordova)) {
                    list = [{
                        "identifier": id,
                        "mediaType": "Content"
                    }]
                    $scope.getRelatedContent(list);
                }
            }else{
                list = $scope.collectionTree;
                $scope.getRelatedContent(list);
                console.info("COOLECTION RELATED CONTENT LOGIC IS NOT IMPLEMENTED..");
            }
        }

        $scope.init = function() {
         $scope.collectionTree = localStorageGC.getItem('collection');
            if ("undefined" != typeof cordova) {
                $scope.renderRelatedContent($stateParams.contentId);
            } else {
                jQuery('#endPageLoader').hide();
                $scope.showRelatedContentHeader = false;
            }
        }

        $scope.$on('getRelatedContentEvent', function(event) {
            $scope.init();
        });

    }).directive('menu', function($rootScope, $sce) {
        return {
            restrict: 'E',
            templateUrl: ("undefined" != typeof localPreview && "local" == localPreview) ? $sce.trustAsResourceUrl(serverPath + 'templates/menu.html') : 'templates/menu.html'
        }
    }).directive('collection', function($rootScope, $state) {
        return {
            restrict: 'E',
            template: '<a ng-click="goToCollection();" href="javascript:void(0);"><img  ng-class="{\'icon-opacity\': isCollec == false}" ng-src="{{imgSrc}}"/></a>',
            scope: {
                isCollec: "="
            },
            link: function(scope, state) {
                scope.imgSrc = $rootScope.imageBasePath + 'icn_collections.png';
                // scope.isCollection = false;
                var pageId = $rootScope.pageId;
                // Code refactring of the Collection Directive is Required
                scope.goToCollection = function() {
                    if (scope.isCollec) {
                        collectionPath.pop();
                        TelemetryService.interact("TOUCH", "gc_collection", "TOUCH", {
                            stageId: ((pageId == "renderer" ? $rootScope.stageData.currentStage : pageId))
                        });
                        if (Renderer.running)
                            Renderer.cleanUp();
                        else
                            TelemetryService.end();
                        $state.go('contentList', {
                            "id": $rootScope.collection.identifier
                        });
                    }
                }
            }
        }
    }).directive('home', function($rootScope, $state) {
        return {
            restrict: 'E',
            scope: {
                disableHome: '=info'

            },
            template: '<a ng-click="goToHome();" href="javascript:void(0);"><img ng-src="{{imgSrc}}"/></a>',
            link: function(scope, state) {
                scope.imgSrc = $rootScope.imageBasePath + 'icn_square_home.png';
                scope.showHome = false;
                if (scope.disableHome == true)
                    scope.showHome = true;
                var pageId = $rootScope.pageId;

                scope.goToHome = function() {
                    TelemetryService.interact("TOUCH", "gc_home", "TOUCH", { stageId: ((pageId == "renderer" ? $rootScope.stageData.currentStage : pageId)) });
                    if (Renderer.running)
                        Renderer.cleanUp();
                    else
                        TelemetryService.end();
                        $state.go('playContent', {
                            'itemId': $rootScope.content.identifier });
                    //window.location.hash = "/show/content/" + GlobalContext.currentContentId;

                }

            }
        }
    }).directive('genie', function($rootScope) {
        return {
            scope: {
                icon: '@'
            },
            restrict: 'E',
            template: '<a href="javascript:void(0)" ng-class="enableGenie ? \'icon-opacity\' : \'\'" ng-click="goToGenie()"><img ng-src="{{imgSrc}}"/></a>',
            link: function(scope) {
                scope.enableGenie = ("undefined" == typeof cordova) ? true : false;
                scope.imgSrc = $rootScope.imageBasePath + scope.icon
                scope.goToGenie = function() {
                    var pageId = $rootScope.pageId;
                    exitApp(pageId);
                }
            }
        }
    }).directive('stageInstructions', function($rootScope) {
        return {
            restrict: 'E',
            template: '<a href="javascript:void(0)"  ng-class="{\'icon-opacity\' : !stageData.params.instructions}" ng-click="showInstructions()"><img ng-src="{{imageBasePath}}teacher_instructions.png" style="z-index:2;"/></a>',
            controller: function($scope, $rootScope) {
                $scope.stageInstMessage = "";
                $scope.showInst = false;

                $scope.showInstructions = function() {
                    $scope.stageInstMessage = ($rootScope.stageData && $rootScope.stageData.params && $rootScope.stageData.params.instructions) ? $rootScope.stageData.params.instructions : null;

                    $scope.showInst = ($scope.stageInstMessage != null) ? true : false;
                    $scope.logIntract("gc_showInst");
                }

                $scope.closeInstructions = function() {
                    $scope.showInst = false;
                    $scope.logIntract("gc_closeInst");
                }

                $scope.logIntract = function(eleId) {
                    TelemetryService.interact("TOUCH", eleId, "TOUCH", {
                        stageId: Renderer.theme._currentStage
                    });
                }

                /*
                 * If menu is getting hide, then hide teacher instructions as well
                 */
                $scope.$watch("menuOpened", function() {
                    if (!$rootScope.menuOpened) {

                        $scope.showInst = false;
                    }
                });
            }
        }
    }).directive('mute', function($rootScope) {
        return {
            restrict: 'E',
            template: '<a href="javascript:void(0)" ng-click="mute()"><img id="mute_id" ng-src="{{imageBasePath}}mute.png" style="position: absolute;margin: 3%;width: 10%;z-index: 1;margin-left: 40%;" /><img id="unmute_id" ng-src="{{unmuteIcon}}"  style="position: absolute;margin: 3% 3% 3% 40%;display: list-item;width: 12%;z-index: 1;"/> </a>',
            link: function(scope, url) {
                scope.mutestatus = "mute.png";
                // If audiomanager is muted change the default sound icon
                if (AudioManager.muted) {
                    scope.unmuteIcon = $rootScope.imageBasePath + "unmute.png";
                    document.getElementById("unmute_id").style.visibility = "visible"
                }
                scope.mute = function() {
                    //mute function goes here
                    if (AudioManager.muted) {
                        AudioManager.unmute();
                        delete scope.unmuteIcon;
                        document.getElementById("unmute_id").removeAttribute("src");
                        document.getElementById("unmute_id").style.visibility = "hidden"
                    } else {
                        AudioManager.mute();
                        scope.unmuteIcon = $rootScope.imageBasePath + "unmute.png";
                        document.getElementById("unmute_id").style.visibility = "visible"
                    }
                  TelemetryService.interact("TOUCH", AudioManager.muted ? "gc_mute" : "gc_unmute" , "TOUCH", { stageId:Renderer.theme._currentStage});
                }
            }
        }
    }).directive('restart', function($rootScope, $state, $stateParams) {
        return {
            restrict: 'E',
            template: '<a href="javascript:void(0)" ng-click="restartContent()"><img src="{{imageBasePath}}icn_replay.png"/></a>',
            link: function(scope) {
                scope.restartContent = function() {
                    $rootScope.replayContent();
                    AudioManager.unmute();
                    if (!_.isUndefined(scope.hideMenu) && scope.menuOpened)
                        scope.hideMenu();
                }
            }
        }
    }).directive('reloadStage', function($rootScope) {
        return {
            restrict: 'E',
            template: '<a href="javascript:void(0)" onclick="EventBus.dispatch(\'actionReload\')"><img id="reload_id" src="{{imageBasePath}}speaker_icon.png" style="width:100%;"/></a>'
        }
    }).directive('popup', function($rootScope, $compile) {
        return {
            restrict: 'E',
            scope: {
                popupBody: '=popupBody'
            },
            template: '<div class="popup"><div class="popup-overlay" ng-click="hidePopup()"></div><div class="popup-full-body"></div></div>',
            link: function(scope, element) {
                scope.icons = $rootScope.icons;
                scope.languageSupport = $rootScope.languageSupport;
                scope.content = $rootScope.content;
                element.bind("popupUpdate", function(event, data) {
                    if (data) {
                        for (key in data) {
                            scope[key] = data[key];
                        };
                    }
                });
                var body = $compile(scope.popupBody)(scope);
                element.find("div.popup-full-body").html();
                element.find("div.popup-full-body").append(body);
                element.hide();
                scope.retryAssessment = function(id, e) {
                    scope.hidePopup(id);
                }

                scope.hidePopup = function(id) {
                    element.hide();
                    TelemetryService.interact("TOUCH", id ? id : "gc_popupclose", "TOUCH", {
                        stageId: ($rootScope.pageId == "endpage" ? "endpage" : $rootScope.stageData.currentStage)
                    });
                };

                scope.moveToNextStage = function(navType) {
                    EventBus.dispatch("actionNavigateSkip", navType);
                }
            }
        }
    }).directive('goodJob', function($rootScope) {
        return {
            restrict: 'E',
            template: '<div class="popup"><div class="popup-overlay" ng-click="hidePopup()"></div><div class="popup-full-body"><div class="font-baloo assess-popup assess-goodjob-popup"><img class="popup-bg-img" ng-src="{{imageBasePath}}img_popup_next.png"/><div class="goodjob_next_div gc-popup-icons-div"><a href="javascript:void(0);" ng-click="hidePopup()"><img class="popup-goodjob-next " ng-src="{{ imageBasePath }}icn_bg_next.png" ng-click="moveToNextStage(\'next\')" /></a><p>{{languageSupport.next}}</p></div></div></div></div>',
            controller: function($scope, $rootScope, $timeout) {
                $scope.retryAssessment = function(id, e) {
                    $scope.hidePopup(id);
                }

                $scope.hidePopup = function(id) {
                    TelemetryService.interact("TOUCH", id ? id : "gc_popupclose", "TOUCH", {
                        stageId: ($rootScope.pageId == "endpage" ? "endpage" : $rootScope.stageData.currentStage)
                    });
                    $scope.showOverlayGoodJob = false;
                    $scope.showOverlayTryAgain = false;
                }

                $scope.moveToNextStage = function(navType) {
                    EventBus.dispatch("actionNavigateSkip", navType);
                }
            }
        }
    }).directive('tryAgain', function($rootScope) {
        return {
            restrict: 'E',
            template: '<div class="popup"><div class="popup-overlay" ng-click="hidePopup()"></div><div class="popup-full-body"><div class="font-baloo assess-popup assess-tryagain-popup"><img class="popup-bg-img" ng-src="{{imageBasePath}}img_popup.png"/><div class="tryagain-retry-div gc-popup-icons-div"><a ng-click="retryAssessment(\'gc_retry\', $event);" href="javascript:void(0);"><img class="popup-retry" ng-src="{{imageBasePath}}icn_bg_replay.png" /></a><p class="gc-popup-retry-replay">{{languageSupport.replay}}</p></div><div class="tryagian-next-div gc-popup-icons-div"><a href="javascript:void(0);" ng-click="hidePopup()"><img class="popup-retry-next" ng-src="{{ imageBasePath }}icn_sml_next.png" ng-click="moveToNextStage(\'next\')" /></a><p>{{languageSupport.next}}</p></div></div></div></div></div></div>',
            controller: function($scope, $rootScope, $timeout) {

            }

        }
    }).directive('assess', function($rootScope) {
        return {
            restrict: 'E',
            scope: {
                image: '=',
                show: '='
            },
            template: '<a class="assess" ng-show="show" ng-class="assessStyle" href="javascript:void(0);" ng-click="onSubmit()"> <!-- enabled --><img ng-src="{{image}}"/></a>',
            link: function(scope, element) {
                scope.labelSubmit = $rootScope.languageSupport.submit;
            },
            controller: function($scope, $rootScope, $timeout) {
                $scope.isEnabled = false;
                $scope.assessStyle = 'assess-disable';

                $rootScope.$watch('enableEval', function() {
                    //Submit buttion style changing(enable/disable) button
                    $scope.isEnabled = $rootScope.enableEval;
                    if ($scope.isEnabled) {
                        //Enable state
                        $timeout(function() {
                            // This timeout is required to apply the changes(because it is calling by JS)
                            $scope.assessStyle = 'assess-enable';
                            $scope.image = $rootScope.imageBasePath + "icn_submit.png";
                        }, 100);
                    } else {
                        //Disable state
                        $scope.assessStyle = 'assess-disable';
                        $scope.image = $rootScope.imageBasePath + "icn_submit_inactive.png";
                    }
                });

                $scope.onSubmit = function() {
                    if ($scope.isEnabled) {
                        $rootScope.defaultSubmit();
                    }
                }
            }
        }
    }).directive('starRating', function($rootScope) {

        return {
            //reference: http://jsfiddle.net/manishpatil/2fahpk7s/
            scope: {
                rating: '=',
                maxRating: '@',
                readOnly: '@',
                click: "&",
                mouseHover: "&",
                mouseLeave: "&",
                emptyRating: '@',
                selectedRating: '@'
            },
            restrict: 'EA',
            template: "<div style='display: inline-block; padding: 1%; cursor:pointer; width:12%; height:45%;' ng-repeat='idx in maxRatings track by $index'> \
                    <img ng-src='{{((hoverValue + _rating) <= $index) && rating_empty || rating_selected }}' \
                    ng-Click='isolatedClick($index + 1)' style='height:100%;' \></img> \
            </div>",
            compile: function(element, attrs) {
                if (!attrs.maxRating || (Number(attrs.maxRating) <= 0)) {
                    attrs.maxRating = '5';
                };
            },
            controller: function($scope, $element, $attrs, $rootScope) {
                $scope.maxRatings = [];
                $scope.rating_empty = $rootScope.imageBasePath + $scope.emptyRating;
                $scope.rating_selected = $rootScope.imageBasePath + $scope.selectedRating;

                for (var i = 1; i <= $scope.maxRating; i++) {
                    $scope.maxRatings.push({});
                };

                $scope._rating = $scope.rating;

                $scope.isolatedClick = function(param) {
                    if ($scope.readOnly == 'true') return;

                    $scope.rating = $scope._rating = param;
                    $scope.hoverValue = 0;
                    $scope.click({
                        param: param
                    });
                };
            }
        };
    }).directive('lastPage', function($rootScope) {
        return {
            restrict: 'E',
            template: '<a href="javascript:void(0)" ng-click="goToLastPage()"><img ng-src="{{imageBasePath}}icn_back_page.png"/></a>',
            link: function(scope) {}
        }
    });
