import { BuildManager } from './build-manager';
import { IBuildNamespace } from './server-models';
import { BuildDefinition, BuildManagerEvents, BuildResult, IBuildInfo, IWelcomeInfo } from './models';
import { Server } from 'net';

export class BuildSockets {
  constructor(private server: SocketIO.Server, private buildMgr: BuildManager) {}

  initializeEvents(): void {
    this.server.on('connection', socket => {
      let welcomeInfo: IWelcomeInfo = {
        allBuildInfo: this.buildMgr.buildInfo,
        queuedBuilds: this.buildMgr.queuedBuildNames,
        isPaused: this.buildMgr.isPaused,
        isReloading: this.buildMgr.isReloading
      };
      socket.emit('welcome', welcomeInfo);
    });

    // server wide events
    this.buildMgr.emitter.on(BuildManagerEvents.StartReload, () => {
      this.server.emit(BuildManagerEvents.StartReload);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.EndReload, (allInfo: IBuildInfo[]) => {
      this.server.emit(BuildManagerEvents.EndReload, allInfo);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.BuildsPaused, () => {
      this.server.emit(BuildManagerEvents.BuildsPaused);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.BuildsResumed, () => {
      this.server.emit(BuildManagerEvents.BuildsResumed);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.StartBuild, (buildResult: BuildResult) => {
      this.server.emit(BuildManagerEvents.StartBuild, buildResult);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.EndBuild, (buildResult: BuildResult) => {
      this.server.emit(BuildManagerEvents.EndBuild, buildResult);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.QueueUpdate, (queuedBuildNames: string[]) => {
      this.server.emit(BuildManagerEvents.QueueUpdate, queuedBuildNames);
    });

    // build specific events
    this.buildMgr.emitter.on(BuildManagerEvents.BuildStep, (buildResult: BuildResult) => {
      this.server.emit(`${BuildManagerEvents.BuildStep}-${encodeURIComponent(buildResult.buildDef.name)}`, buildResult);
    });
  }
}
