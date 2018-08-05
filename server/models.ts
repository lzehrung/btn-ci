export interface IBuildInfo {
  buildDef: BuildDefinition;
  latestRun: BuildResult;
  watching: boolean;
}

export class BuildResult {
  constructor(
    public name: string,
    public buildDef: BuildDefinition,
    public lastUpdated = new Date().toJSON(),
    public result = BuildStatus.Running,
    public log: LogLine[] = []
  ) {}
}

export enum BuildStatus {
  Running = 'Running',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
  Unstable = 'Unstable',
  Success = 'Success'
}

export class LogLine {
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