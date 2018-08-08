import { BuildService } from './build.service';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

import { AppComponent } from './app.component';

const socketConfig: SocketIoConfig = { url: window.location.origin, options: {} };

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    SocketIoModule.forRoot(socketConfig),
    BrowserAnimationsModule,
    MatExpansionModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  providers: [BuildService],
  bootstrap: [AppComponent]
})
export class AppModule {}
