import { Component, OnInit } from '@angular/core';
import { BuildDefinition, IBuildInfo, BuildStatus, BuildResult } from '../../../server/models';
import { BuildService } from 'src/app/build.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'BetterThanNothingCI';
  emoji = '😉';
  homePageEmojis = ['😉', '😂', '😍', '😆', '😎', '🤔', '🤪', '🤖'];
  miscEmojis = ['🍕', '🍔', '🥓', '💣', '☠️'];
  builds: IBuildInfo[] = [];

  constructor(private buildService: BuildService) {}

  ngOnInit(): void {
    const emojiIndex = Math.floor(Math.random() * this.homePageEmojis.length);
    const emoji = this.homePageEmojis[emojiIndex];
    this.emoji = emoji;

    this.loadBuilds();

    // try to refresh the builds every 30 seconds
    setInterval(() => {
      var watched = this.builds.filter(build => {
        return build.watching;
      });
      // if no builds are currently watched, reload the builds
      if (!watched || watched.length < 1) {
        this.loadBuilds();
      }
    }, 30000);
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
          // build started, now we can watch for its logs
          this.checkBuild(buildName);
        },
        () => {
          window.location.reload();
        }
      );
    }
  }

  findBuild(buildName: string): IBuildInfo {
    let matching = this.builds.filter((info: IBuildInfo) => {
      return info.buildDef.name == buildName;
    });
    if (!!matching) {
      return matching[0];
    }
    return null;
  }

  checkBuild(buildName: string): void {
    let buildInfo = this.findBuild(buildName);
    if (!!buildInfo) {
      this.buildService.checkBuild(buildName).subscribe(
        (buildResult: IBuildInfo) => {
          if (!!buildResult) {
            let buildInfo = this.findBuild(buildName);
            buildInfo.latestRun = buildResult.latestRun;
            if (buildInfo.latestRun.result == BuildStatus.Running) {
              // still running, check again in a few seconds
              setTimeout(() => {
                this.checkBuild(buildName);
              }, 2000);
            } else {
              buildInfo.watching = false;
            }
          } else {
            buildInfo.watching = false;
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
