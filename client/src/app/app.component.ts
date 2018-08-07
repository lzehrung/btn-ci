import { Component, OnInit } from '@angular/core';
import { BuildDefinition, IBuildInfo, BuildStatus, BuildResult, BuildManagerEvents } from '../../../server/models';
import { BuildService } from 'src/app/build.service';
import { Socket } from 'ngx-socket-io';
import { OnDestroy } from '@angular/core/src/metadata/lifecycle_hooks';
import { ViewChildren } from '@angular/core';
import { MatExpansionPanel } from '@angular/material/expansion';
import { QueryList } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'BetterThanNothing CI';
  emoji = '😉';
  homePageEmojis = ['😉', '😂', '😍', '😆', '😎', '🤔', '🤪', '🤖'];
  miscEmojis = ['🍕', '🍔', '🥓', '💣', '☠️'];
  builds: IBuildInfo[] = [];

  @ViewChildren(MatExpansionPanel) expansionPanels: QueryList<MatExpansionPanel>;

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
  }

  ngOnDestroy(): void {
    this.socketService.disconnect(true);
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

  buildOpened(build: IBuildInfo) {
    // subscribe to this build's events
    this.socketService.on(
      `${BuildManagerEvents.StartBuildStep}-${encodeURIComponent(build.buildDef.name)}`,
      (buildResult: BuildResult) => {
        let build = this.findBuild(buildResult.buildDef.name);
        build.latestRun = buildResult;
      }
    );

    this.socketService.on(
      `${BuildManagerEvents.UpdateBuildStep}-${encodeURIComponent(build.buildDef.name)}`,
      (buildResult: BuildResult) => {
        let build = this.findBuild(buildResult.buildDef.name);
        build.latestRun = buildResult;
      }
    );

    this.socketService.on(
      `${BuildManagerEvents.EndBuildStep}-${encodeURIComponent(build.buildDef.name)}`,
      (buildResult: BuildResult) => {
        let build = this.findBuild(buildResult.buildDef.name);
        build.latestRun = buildResult;
      }
    );
  }

  buildClosed(build: IBuildInfo) {
    this.socketService.removeAllListeners(
      `${BuildManagerEvents.StartBuildStep}-${encodeURIComponent(build.buildDef.name)}`
    );
    this.socketService.removeAllListeners(
      `${BuildManagerEvents.UpdateBuildStep}-${encodeURIComponent(build.buildDef.name)}`
    );
    this.socketService.removeAllListeners(
      `${BuildManagerEvents.EndBuildStep}-${encodeURIComponent(build.buildDef.name)}`
    );
  }

  backToTop() {
    window.scrollTo(0, 0);
  }

  close() {
    this.expansionPanels.forEach(panel => {
      panel.close();
    });
  }
}
