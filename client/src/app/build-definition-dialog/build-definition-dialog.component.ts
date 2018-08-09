import { Component, OnInit } from '@angular/core';
import { BuildDefinition } from '../../../../server/models';
import { Input } from '@angular/core';
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-build-definition-dialog',
  templateUrl: './build-definition-dialog.component.html',
  styleUrls: ['./build-definition-dialog.component.css']
})
export class BuildDefinitionDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: IDialogData) {}
}

export interface IDialogData {
  buildName: string;
  json: string;  
}