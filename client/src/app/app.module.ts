import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

import { AppComponent } from './app.component';
import { BuildService } from './build.service';
import { BuildDefinitionDialogComponent } from './build-definition-dialog/build-definition-dialog.component';

const socketConfig: SocketIoConfig = { url: window.location.origin, options: {} };

@NgModule({
  declarations: [AppComponent, BuildDefinitionDialogComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    SocketIoModule.forRoot(socketConfig),
    BrowserAnimationsModule,
    MatExpansionModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDialogModule
  ],
  providers: [BuildService],
  bootstrap: [AppComponent],
  entryComponents: [BuildDefinitionDialogComponent]
})
export class AppModule {}
