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
    return this.http.post(`builds/${encodeURIComponent(name)}/start`, null, {
      responseType: 'text'
    });
  }

  checkBuild(name: string): Observable<IBuildInfo> {
    return this.http.get<IBuildInfo>(`builds/${encodeURIComponent(name)}`);
  }

  cancelBuild(name: any): Observable<any> {
    return this.http.post(`builds/${encodeURIComponent(name)}/cancel`, null, {
      responseType: 'text'
    });
  }

  reload(): Observable<any> {
    return this.http.post(`builds/reload`, null, {
      responseType: 'text'
    });
  }

  pause(): Observable<any> {
    return this.http.post(`pause`, null, {
      responseType: 'text'
    });
  }

  resume(): Observable<any> {
    return this.http.post(`resume`, null, {
      responseType: 'text'
    });
  }
}
