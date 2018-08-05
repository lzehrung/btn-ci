import { Injectable } from '@angular/core';
import { Observable } from '../../node_modules/rxjs';
import { HttpClient } from '@angular/common/http';
import { IBuildInfo } from '../../../server/models';

@Injectable({
  providedIn: 'root'
})
export class BuildService {
  constructor(private http: HttpClient) {}

  getBuilds(): Observable<IBuildInfo[]> {
    return this.http.get<IBuildInfo[]>('builds');
  }

  startBuild(name: string): Observable<any> {
    return this.http.post(`builds/${name}/start`, null);
  }

  checkBuild(name: string): Observable<IBuildInfo> {
    return this.http.get<IBuildInfo>(`builds/${name}`);
  }

  cancelBuild(name: any): Observable<any> {
    return this.http.post(`builds/${name}/cancel`, null);
  }
}

// export interface IBuildInfo {
//   buildDef: IBuildDefinition;
//   latestRun: IBuildResult;
//   watching: boolean;
// }

// export interface IBuildResult {
//   name: string;
//   buildDef: string;
//   lastUpdated: string;
//   result: BuildStatus;
//   log: LogLine[];
// }

// export class BuildStatus {
//   public static Running = 'Running';
//   public static Failed = 'Failed';
//   public static Cancelled = 'Cancelled';
//   public static Unstable = 'Unstable';
//   public static Success = 'Success';
// }

// export interface LogLine {
//   time: string;
//   message: string;
//   command: string;
// }

// export interface IBuildDefinition {
//   name: string;
//   directory: string;
//   schedule: string;
//   steps: IBuildStep[];
// }

// export interface IBuildStep {
//   command: string;
//   args: string[];
//   directory: string;
// }
