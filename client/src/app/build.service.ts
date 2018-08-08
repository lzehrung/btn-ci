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

  reload(): Observable<any> {
    return this.http.post(`builds/reload`, null);
  }

  pause(): Observable<any> {
    return this.http.post(`pause`, null);
  }

  resume(): Observable<any> {
    return this.http.post(`resume`, null);
  }
}
