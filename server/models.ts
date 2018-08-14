export interface IBuildInfo {
  definition: BuildDefinition;
  latest: BuildResult | null;
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
  BuildStep = 'build-step',
  BuildLog = 'build-log',
  StartReload = 'start-reload',
  EndReload = 'end-reload',
  QueueUpdate = 'queue-update',
  BuildsPaused = 'builds-paused',
  BuildsResumed = 'builds-resumed'  
}

export interface IScheduledBuild {
  buildName: string;
  job: any;
}

export interface IWelcomeInfo {
  allBuildInfo: IBuildInfo[];
  queuedBuilds: string[];
  isPaused: boolean;
  isReloading: boolean;
}