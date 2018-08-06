import { Component, OnInit } from '@angular/core';
import { BuildDefinition, IBuildInfo, BuildStatus, BuildResult, BuildManagerEvents } from '../../../server/models';
import { BuildService } from 'src/app/build.service';
import { Socket } from 'ngx-socket-io';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'BetterThanNothing CI';
  emoji = '😉';
  homePageEmojis = ['😉', '😂', '😍', '😆', '😎', '🤔', '🤪', '🤖'];
  miscEmojis = ['🍕', '🍔', '🥓', '💣', '☠️'];
  builds: IBuildInfo[] = [];

  constructor(private buildService: BuildService, private socketService: Socket) {}

  ngOnInit(): void {
    const emojiIndex = Math.floor(Math.random() * this.homePageEmojis.length);
    const emoji = this.homePageEmojis[emojiIndex];
    this.emoji = emoji;

    this.loadBuilds();

    // TODO: add reload button, watch for server build reloads, disable interaction until reload complete

    this.socketService.on(BuildManagerEvents.StartBuild, (buildResult: BuildResult) => {
      let build = this.findBuild(buildResult.buildDef.name);
      build.latestRun = buildResult;
    });

    this.socketService.on(BuildManagerEvents.EndBuild, (buildResult: BuildResult) => {
      let build = this.findBuild(buildResult.buildDef.name);
      build.latestRun = buildResult;
    });

    this.socketService.on(BuildManagerEvents.StartBuildStep, (buildResult: BuildResult) => {
      let build = this.findBuild(buildResult.buildDef.name);
      build.latestRun = buildResult;
    });

    this.socketService.on(BuildManagerEvents.UpdateBuildStep, (buildResult: BuildResult) => {
      let build = this.findBuild(buildResult.buildDef.name);
      build.latestRun = buildResult;
    });

    this.socketService.on(BuildManagerEvents.EndBuildStep, (buildResult: BuildResult) => {
      let build = this.findBuild(buildResult.buildDef.name);
      build.latestRun = buildResult;
    });
  }

  chipClass(buildInfo: IBuildInfo) {
    let chipClass = '';
    if (buildInfo.latestRun && buildInfo.latestRun.result) {
      switch (buildInfo.latestRun.result) {
        case BuildStatus.Success:
          chipClass = 'success';
          break;
        case BuildStatus.Cancelled:
          chipClass = 'cancelled';
          break;
        case BuildStatus.Failed:
          chipClass = 'failed';
          break;
        case BuildStatus.Running:
          chipClass = 'running';
          break;
      }
    }
    return chipClass;
  }

  loadBuilds(): void {
    this.buildService.getBuilds().subscribe(builds => {
      this.builds = builds;
      for (let build of this.builds) {
        // if its latest run is currently running, start watching it
        if (!!build.latestRun && build.latestRun.result == BuildStatus.Running) {
          build.watching = true;
          this.checkBuild(build.buildDef.name);
        }
      }
    });
  }

  startBuild(buildName: string): void {
    let buildInfo = this.findBuild(buildName);
    if (!!buildInfo) {
      this.buildService.startBuild(buildName).subscribe(
        (result: BuildResult) => {
          let buildInfo = this.findBuild(buildName);
          buildInfo.latestRun = result;
        },
        () => {
          window.location.reload();
        }
      );
    }
  }

  findBuild(buildName: string): IBuildInfo {
    let matching = this.builds.find((info: IBuildInfo) => {
      return info.buildDef.name == buildName;
    });
    return matching;
  }

  checkBuild(buildName: string): void {
    let buildInfo = this.findBuild(buildName);
    if (!!buildInfo) {
      this.buildService.checkBuild(buildName).subscribe(
        (buildResult: IBuildInfo) => {
          if (!!buildResult) {
            let buildInfo = this.findBuild(buildName);
            buildInfo.latestRun = buildResult.latestRun;
          }
        },
        () => {
          window.location.reload();
        }
      );
    }
  }

  cancelBuild(buildName: string): void {
    let buildInfo = this.findBuild(buildName);
    if (!!buildInfo) {
      this.buildService.cancelBuild(buildName).subscribe((buildInfo: IBuildInfo) => {
        if (buildInfo.latestRun.result == BuildStatus.Cancelled) {
          console.log('cancelled build');
        }
      });
    }
  }

  isRunning(buildInfo: IBuildInfo): boolean {
    return !!buildInfo.latestRun && buildInfo.latestRun.result == BuildStatus.Running;
  }
}
