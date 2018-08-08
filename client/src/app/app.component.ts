import { Component, OnInit } from '@angular/core';
import {
  BuildDefinition,
  IBuildInfo,
  BuildStatus,
  BuildResult,
  BuildManagerEvents,
  IWelcomeInfo
} from '../../../server/models';
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
  queuedBuilds: string[] = [];
  isPaused: boolean = false;
  isReloading: boolean = false;

  @ViewChildren(MatExpansionPanel) expansionPanels: QueryList<MatExpansionPanel>;

  constructor(private buildService: BuildService, private socketService: Socket) {}

  ngOnInit(): void {
    const emojiIndex = Math.floor(Math.random() * this.homePageEmojis.length);
    const emoji = this.homePageEmojis[emojiIndex];
    this.emoji = emoji;

    // TODO: add reload button, watch for server build reloads, disable interaction until reload complete
    this.socketService.on('welcome', (welcome: IWelcomeInfo) => {
      this.builds = welcome.allBuildInfo;
      this.queuedBuilds = welcome.queuedBuilds;
      this.isPaused = welcome.isPaused;
      this.isReloading = welcome.isReloading;
    });

    this.socketService.on(BuildManagerEvents.StartBuild, (buildResult: BuildResult) => {
      let build = this.findBuild(buildResult.buildDef.name);
      build.latest = buildResult;
    });

    this.socketService.on(BuildManagerEvents.EndBuild, (buildResult: BuildResult) => {
      let build = this.findBuild(buildResult.buildDef.name);
      build.latest = buildResult;
    });

    this.socketService.on(BuildManagerEvents.BuildsPaused, () => {
      this.isPaused = true;
    });

    this.socketService.on(BuildManagerEvents.BuildsResumed, () => {
      this.isPaused = false;
    });

    this.socketService.on(BuildManagerEvents.StartReload, () => {
      this.isReloading = true;
    });

    this.socketService.on(BuildManagerEvents.EndReload, (allInfo: IBuildInfo[]) => {
      this.isReloading = false;
      this.builds = allInfo;
    });

    this.socketService.on(BuildManagerEvents.QueueUpdate, (queuedBuilds: string[]) => {
      this.queuedBuilds = queuedBuilds;
    });
  }

  ngOnDestroy(): void {
    this.socketService.disconnect(true);
  }

  chipClass(buildInfo: IBuildInfo) {
    let chipClass = '';
    if (buildInfo.latest && buildInfo.latest.result) {
      switch (buildInfo.latest.result) {
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

  startBuild(buildInfo: IBuildInfo): void {
    this.buildService.startBuild(buildInfo.definition.name).subscribe(
      (result: BuildResult) => {
        buildInfo.latest = result;
      },
      () => {
        window.location.reload();
      }
    );
  }

  findBuild(buildName: string): IBuildInfo {
    let matching = this.builds.find((info: IBuildInfo) => {
      return info.definition.name == buildName;
    });
    return matching;
  }

  checkBuild(buildInfo: IBuildInfo): void {
    this.buildService.checkBuild(buildInfo.definition.name).subscribe(
      (buildResult: IBuildInfo) => {
        if (!!buildResult) {
          buildInfo.latest = buildResult.latest;
        }
      },
      () => {
        window.location.reload();
      }
    );
  }

  cancelBuild(buildInfo: IBuildInfo): void {
    this.buildService.cancelBuild(buildInfo.definition.name).subscribe((buildInfo: IBuildInfo) => {
      if (buildInfo.latest.result == BuildStatus.Cancelled) {
        console.log('cancelled build');
      }
    });
  }

  isRunning(buildInfo: IBuildInfo): boolean {
    return !!buildInfo.latest && buildInfo.latest.result == BuildStatus.Running;
  }

  buildOpened(build: IBuildInfo) {
    // subscribe to this build's events
    let eventName = `${BuildManagerEvents.BuildStep}-${encodeURIComponent(build.definition.name)}`;
    this.socketService.on(eventName, (buildResult: BuildResult) => {
      let build = this.findBuild(buildResult.buildDef.name);
      build.latest = buildResult;
    });
  }

  buildClosed(build: IBuildInfo) {
    let eventName = `${BuildManagerEvents.BuildStep}-${encodeURIComponent(build.definition.name)}`;
    this.socketService.removeAllListeners(eventName);
  }

  reload(): void {}

  serverPause(pause: boolean): void {}

  goToBottom(index: number) {
    let buildPanel = document.getElementById('build-' + index);
    if (buildPanel) {
      buildPanel.scrollIntoView(false);
    }
  }

  backToTop(index: number) {
    let buildPanel = document.getElementById('build-' + index);
    if (buildPanel) {
      buildPanel.scrollIntoView(true);
    }
  }

  close() {
    this.expansionPanels.forEach(panel => {
      panel.close();
    });
  }
}
