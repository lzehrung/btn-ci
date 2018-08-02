(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{

/***/ "./src/$$_lazy_route_resource lazy recursive":
/*!**********************************************************!*\
  !*** ./src/$$_lazy_route_resource lazy namespace object ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error('Cannot find module "' + req + '".');
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "./src/$$_lazy_route_resource lazy recursive";

/***/ }),

/***/ "./src/app/app.component.css":
/*!***********************************!*\
  !*** ./src/app/app.component.css ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ".time-col {\r\n  min-width: 175px;\r\n}\r\n.step-col {\r\n  min-width: 100px;\r\n}\r\n.build-name {\r\n  font-size: x-large;\r\n}\r\n.table-header {\r\n  font-weight: bold;\r\n}\r\n"

/***/ }),

/***/ "./src/app/app.component.html":
/*!************************************!*\
  !*** ./src/app/app.component.html ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<!--The content below is only a placeholder and can be replaced.-->\r\n<div style=\"text-align:center\">\r\n  <h1>\r\n    {{ title }} {{ emoji }}\r\n  </h1>\r\n</div>\r\n<h2>Builds:</h2>\r\n<div *ngFor=\"let build of builds\">\r\n  <div>\r\n    <div class=\"build-name\">{{build.buildDef.name}}</div>\r\n    <ng-container *ngIf=\"!build.watching\">\r\n      <button type=\"button\" (click)=\"checkBuild(build.buildDef.name)\">Refresh</button>\r\n    </ng-container>\r\n    &nbsp;&nbsp;\r\n    <ng-container *ngIf=\"!isRunning(build)\">\r\n      <button type=\"button\" (click)=\"startBuild(build.buildDef.name)\">Start</button>\r\n    </ng-container>\r\n    <ng-container *ngIf=\"isRunning(build)\">\r\n      <button type=\"button\" (click)=\"cancelBuild(build.buildDef.name)\">Cancel</button>\r\n    </ng-container>\r\n  </div>\r\n  <ng-container *ngIf=\"build.latestRun\">\r\n    <div>\r\n      <h3>Latest Build</h3>\r\n      <h4>{{build.latestRun.lastUpdated | date:'h:mm:ss a, yyyy-MMMM-dd' }} ({{build.latestRun.result}}):</h4>\r\n      <table>\r\n        <thead class=\"table-header\">\r\n          <tr>\r\n            <td class=\"time-col\">Time</td>\r\n            <td class=\"step-col\">Step</td>\r\n            <td>Message</td>\r\n          </tr>\r\n        </thead>\r\n        <tbody>\r\n          <tr *ngFor=\"let line of build.latestRun.log\">\r\n            <td class=\"time-col\">{{line.time | date:'yyyy-MM-dd h:mm:ss a'}}</td>\r\n            <td class=\"step-col\">{{line.command}}</td>\r\n            <td>\r\n              <pre>{{line.message}}</pre>\r\n            </td>\r\n          </tr>\r\n        </tbody>\r\n      </table>\r\n    </div>\r\n  </ng-container>\r\n</div>\r\n"

/***/ }),

/***/ "./src/app/app.component.ts":
/*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
/*! exports provided: AppComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppComponent", function() { return AppComponent; });
/* harmony import */ var _build_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./build.service */ "./src/app/build.service.ts");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var AppComponent = /** @class */ (function () {
    function AppComponent(buildService) {
        this.buildService = buildService;
        this.title = 'BetterThanNothingCI';
        this.emoji = '😉';
        this.homePageEmojis = ['😉', '😂', '😍', '😆', '😎', '🤔', '🤪', '🤖'];
        this.foodEmojis = ['🍕', '🍔', '🥓', '💣', '☠️'];
        // '💎',
        // '💰',
        this.builds = [];
    }
    AppComponent.prototype.ngOnInit = function () {
        var _this = this;
        var emojiIndex = Math.floor(Math.random() * this.homePageEmojis.length);
        var emoji = this.homePageEmojis[emojiIndex];
        this.emoji = emoji;
        this.loadBuilds();
        // try to refresh the builds every 30 seconds
        setInterval(function () {
            var watched = _this.builds.filter(function (build) {
                return build.watching;
            });
            // if no builds are currently watched, reload the builds
            if (!watched || watched.length < 1) {
                _this.loadBuilds();
            }
        }, 30000);
    };
    AppComponent.prototype.loadBuilds = function () {
        var _this = this;
        this.buildService.getBuilds().subscribe(function (builds) {
            _this.builds = builds;
            for (var _i = 0, _a = _this.builds; _i < _a.length; _i++) {
                var build = _a[_i];
                // if its latest run is currently running, start watching it
                if (!!build.latestRun && build.latestRun.result == _build_service__WEBPACK_IMPORTED_MODULE_0__["BuildStatus"].Running) {
                    build.watching = true;
                    _this.checkBuild(build.buildDef.name);
                }
            }
        });
    };
    AppComponent.prototype.startBuild = function (buildName) {
        var _this = this;
        var buildInfo = this.findBuild(buildName);
        if (!!buildInfo) {
            this.buildService.startBuild(buildName).subscribe(function (result) {
                var buildInfo = _this.findBuild(buildName);
                buildInfo.latestRun = result;
                // build started, now we can watch for its logs
                _this.checkBuild(buildName);
            }, function () {
                window.location.reload();
            });
        }
    };
    AppComponent.prototype.findBuild = function (buildName) {
        var matching = this.builds.filter(function (info) {
            return info.buildDef.name == buildName;
        });
        if (!!matching) {
            return matching[0];
        }
        return null;
    };
    AppComponent.prototype.checkBuild = function (buildName) {
        var _this = this;
        var buildInfo = this.findBuild(buildName);
        if (!!buildInfo) {
            this.buildService.checkBuild(buildName).subscribe(function (buildResult) {
                if (!!buildResult) {
                    var buildInfo_1 = _this.findBuild(buildName);
                    buildInfo_1.latestRun = buildResult.latestRun;
                    if (buildInfo_1.latestRun.result == 'Running') {
                        // still running, check again in a few seconds
                        setTimeout(function () {
                            _this.checkBuild(buildName);
                        }, 2000);
                    }
                    else {
                        buildInfo_1.watching = false;
                    }
                }
                else {
                    buildInfo.watching = false;
                }
            }, function () {
                window.location.reload();
            });
        }
    };
    AppComponent.prototype.cancelBuild = function (buildName) {
        var buildInfo = this.findBuild(buildName);
        if (!!buildInfo) {
            this.buildService.cancelBuild(buildName).subscribe(function (buildInfo) {
                if (buildInfo.latestRun.result == 'Cancelled') {
                    console.log('cancelled build');
                }
            });
        }
    };
    AppComponent.prototype.isRunning = function (buildInfo) {
        return !!buildInfo.latestRun && buildInfo.latestRun.result == _build_service__WEBPACK_IMPORTED_MODULE_0__["BuildStatus"].Running;
    };
    AppComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"])({
            selector: 'app-root',
            template: __webpack_require__(/*! ./app.component.html */ "./src/app/app.component.html"),
            styles: [__webpack_require__(/*! ./app.component.css */ "./src/app/app.component.css")]
        }),
        __metadata("design:paramtypes", [_build_service__WEBPACK_IMPORTED_MODULE_0__["BuildService"]])
    ], AppComponent);
    return AppComponent;
}());



/***/ }),

/***/ "./src/app/app.module.ts":
/*!*******************************!*\
  !*** ./src/app/app.module.ts ***!
  \*******************************/
/*! exports provided: AppModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppModule", function() { return AppModule; });
/* harmony import */ var _build_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./build.service */ "./src/app/build.service.ts");
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm5/platform-browser.js");
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm5/http.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./app.component */ "./src/app/app.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};





var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_3__["NgModule"])({
            declarations: [
                _app_component__WEBPACK_IMPORTED_MODULE_4__["AppComponent"]
            ],
            imports: [
                _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__["BrowserModule"],
                _angular_common_http__WEBPACK_IMPORTED_MODULE_2__["HttpClientModule"]
            ],
            providers: [
                _build_service__WEBPACK_IMPORTED_MODULE_0__["BuildService"]
            ],
            bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_4__["AppComponent"]]
        })
    ], AppModule);
    return AppModule;
}());



/***/ }),

/***/ "./src/app/build.service.ts":
/*!**********************************!*\
  !*** ./src/app/build.service.ts ***!
  \**********************************/
/*! exports provided: BuildService, BuildStatus */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BuildService", function() { return BuildService; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BuildStatus", function() { return BuildStatus; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/common/http */ "./node_modules/@angular/common/fesm5/http.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var BuildService = /** @class */ (function () {
    function BuildService(http) {
        this.http = http;
    }
    BuildService.prototype.getBuilds = function () {
        return this.http.get('builds');
    };
    BuildService.prototype.startBuild = function (name) {
        return this.http.post("start/" + name, null);
    };
    BuildService.prototype.checkBuild = function (name) {
        return this.http.get("builds/" + name);
    };
    BuildService.prototype.cancelBuild = function (name) {
        return this.http.post("cancel/" + name, null);
    };
    BuildService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])({
            providedIn: 'root'
        }),
        __metadata("design:paramtypes", [_angular_common_http__WEBPACK_IMPORTED_MODULE_1__["HttpClient"]])
    ], BuildService);
    return BuildService;
}());

var BuildStatus = /** @class */ (function () {
    function BuildStatus() {
    }
    BuildStatus.Running = 'Running';
    BuildStatus.Failed = 'Failed';
    BuildStatus.Cancelled = 'Cancelled';
    BuildStatus.Unstable = 'Unstable';
    BuildStatus.Success = 'Success';
    return BuildStatus;
}());



/***/ }),

/***/ "./src/environments/environment.ts":
/*!*****************************************!*\
  !*** ./src/environments/environment.ts ***!
  \*****************************************/
/*! exports provided: environment */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "environment", function() { return environment; });
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
var environment = {
    production: false
};
/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser-dynamic */ "./node_modules/@angular/platform-browser-dynamic/fesm5/platform-browser-dynamic.js");
/* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./app/app.module */ "./src/app/app.module.ts");
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./environments/environment */ "./src/environments/environment.ts");




if (_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].production) {
    Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["enableProdMode"])();
}
Object(_angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__["platformBrowserDynamic"])().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_2__["AppModule"])
    .catch(function (err) { return console.log(err); });


/***/ }),

/***/ 0:
/*!***************************!*\
  !*** multi ./src/main.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! C:\bitbucket\btn-ci\client\src\main.ts */"./src/main.ts");


/***/ })

},[[0,"runtime","vendor"]]]);
//# sourceMappingURL=main.js.map