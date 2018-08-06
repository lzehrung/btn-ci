export interface IBuildInfo {
  buildDef: BuildDefinition;
  latestRun: BuildResult | null;
  watching: boolean | undefined;
}

export class BuildResult {
  constructor(
    public name: string,
    public buildDef: BuildDefinition,
    public lastUpdated = new Date().toJSON(),
    public result: BuildStatus = BuildStatus.Running,
    public log: LogMessage[] = []
  ) {}
}

export enum BuildStatus {
  Running = 'Running',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
  Unstable = 'Unstable',
  Success = 'Success'
}

export class LogMessage {
  constructor(public message: string = '', public command: string = '', public time = new Date().toJSON()) {}
}

export class BuildDefinition {
  constructor(
    public name: string = '',
    public directory: string = '',
    public schedule: string = '',
    public emailFrom: string = '',
    public emailTo: string = '',
    public onlyRunForChanges: boolean = false,
    public steps: BuildStep[] = []
  ) {}
}

export class BuildStep {
  constructor(
    public name: string = '',
    public command: string = '',
    public args: string[] = [],
    public directory: string = '',
    public failText: string = '',
    public unstableText: string = ''
  ) {}
}

export class BuildDefFile {
  constructor(public fileName: string, public buildName: string) {}
}

export enum BuildManagerEvents {
  StartBuild = 'start-build',
  EndBuild = 'end-build',
  StartBuildStep = 'start-build-step',
  UpdateBuildStep = 'update-build-step',
  EndBuildStep = 'end-build-step',
  StartReload = 'start-reload',
  EndReload = 'end-reload'
}