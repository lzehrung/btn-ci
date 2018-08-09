import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BuildDefinitionDialogComponent } from './build-definition-dialog.component';

describe('BuildDefinitionDialogComponent', () => {
  let component: BuildDefinitionDialogComponent;
  let fixture: ComponentFixture<BuildDefinitionDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BuildDefinitionDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuildDefinitionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
