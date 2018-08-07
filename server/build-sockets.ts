import { BuildManager } from './build-manager';
import { IBuildNamespace } from './server-models';
import { BuildDefinition, BuildManagerEvents, BuildResult } from './models';

export class BuildSockets {
  constructor(private server: SocketIO.Server, private buildMgr: BuildManager) {}

  initializeEvents(): void {
    // server wide events
    this.buildMgr.emitter.on(BuildManagerEvents.StartReload, () => {
      this.server.emit(BuildManagerEvents.StartReload);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.EndReload, (buildDefs: BuildDefinition[]) => {
      this.server.emit(BuildManagerEvents.EndReload, buildDefs);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.StartBuild, (buildResult: BuildResult) => {
      this.server.emit(BuildManagerEvents.StartBuild, buildResult);
    });

    this.buildMgr.emitter.on(BuildManagerEvents.EndBuild, (buildResult: BuildResult) => {
      this.server.emit(BuildManagerEvents.EndBuild, buildResult);
    });

    // build specific events
    this.buildMgr.emitter.on(BuildManagerEvents.StartBuildStep, (buildResult: BuildResult) => {
      this.server.emit(
        `${BuildManagerEvents.StartBuildStep}-${encodeURIComponent(buildResult.buildDef.name)}`,
        buildResult
      );
    });

    this.buildMgr.emitter.on(BuildManagerEvents.UpdateBuildStep, (buildResult: BuildResult) => {
      this.server.emit(
        `${BuildManagerEvents.UpdateBuildStep}-${encodeURIComponent(buildResult.buildDef.name)}`,
        buildResult
      );
    });

    this.buildMgr.emitter.on(BuildManagerEvents.EndBuildStep, (buildResult: BuildResult) => {
      this.server.emit(
        `${BuildManagerEvents.EndBuildStep}-${encodeURIComponent(buildResult.buildDef.name)}`,
        buildResult
      );
    });
  }
}
