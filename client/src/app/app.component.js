"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_service_1 = require("./build.service");
const core_1 = require("@angular/core");
let AppComponent = class AppComponent {
    constructor(buildService) {
        this.buildService = buildService;
        this.title = 'BetterThanNothingCI';
        this.emoji = '😉';
        this.homePageEmojis = ['😉', '😂', '😍', '😆', '😎', '🤔', '🤪', '🤖'];
        this.foodEmojis = ['🍕', '🍔', '🥓', '💣', '☠️'];
        // '💎',
        // '💰',
        this.builds = [];
    }
    ngOnInit() {
        const emojiIndex = Math.floor(Math.random() * this.homePageEmojis.length);
        const emoji = this.homePageEmojis[emojiIndex];
        this.emoji = emoji;
        this.loadBuilds();
        // try to refresh the builds every 30 seconds
        setInterval(() => {
            var watched = this.builds.filter((build) => {
                return build.watching;
            });
            // if no builds are currently watched, reload the builds
            if (!watched || watched.length < 1) {
                this.loadBuilds();
            }
        }, 30000);
    }
    loadBuilds() {
        this.buildService.getBuilds().subscribe((builds) => {
            this.builds = builds;
            for (let build of this.builds) {
                // if its latest run is currently running, start watching it
                if (!!build.latestRun && build.latestRun.result == build_service_1.BuildStatus.Running) {
                    build.watching = true;
                    this.checkBuild(build.buildDef.name);
                }
            }
        });
    }
    startBuild(buildName) {
        let buildInfo = this.findBuild(buildName);
        if (!!buildInfo) {
            this.buildService.startBuild(buildName).subscribe((result) => {
                let buildInfo = this.findBuild(buildName);
                buildInfo.latestRun = result;
                // build started, now we can watch for its logs
                this.checkBuild(buildName);
            }, () => {
                window.location.reload();
            });
        }
    }
    findBuild(buildName) {
        let matching = this.builds.filter((info) => {
            return info.buildDef.name == buildName;
        });
        if (!!matching) {
            return matching[0];
        }
        return null;
    }
    checkBuild(buildName) {
        let buildInfo = this.findBuild(buildName);
        if (!!buildInfo) {
            this.buildService.checkBuild(buildName).subscribe((buildResult) => {
                if (!!buildResult) {
                    let buildInfo = this.findBuild(buildName);
                    buildInfo.latestRun = buildResult.latestRun;
                    if (buildInfo.latestRun.result == 'Running') {
                        // still running, check again in a few seconds
                        setTimeout(() => {
                            this.checkBuild(buildName);
                        }, 2000);
                    }
                    else {
                        buildInfo.watching = false;
                    }
                }
                else {
                    buildInfo.watching = false;
                }
            }, () => {
                window.location.reload();
            });
        }
    }
    cancelBuild(buildName) {
        let buildInfo = this.findBuild(buildName);
        if (!!buildInfo) {
            this.buildService.cancelBuild(buildName).subscribe((buildInfo) => {
                if (buildInfo.latestRun.result == 'Cancelled') {
                    console.log('cancelled build');
                }
            });
        }
    }
    isRunning(buildInfo) {
        return !!buildInfo.latestRun && buildInfo.latestRun.result == build_service_1.BuildStatus.Running;
    }
};
AppComponent = __decorate([
    core_1.Component({
        selector: 'app-root',
        templateUrl: './app.component.html',
        styleUrls: ['./app.component.css']
    }),
    __metadata("design:paramtypes", [build_service_1.BuildService])
], AppComponent);
exports.AppComponent = AppComponent;
