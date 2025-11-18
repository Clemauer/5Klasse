import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BasicGeometriesComponent } from './basic-geometries.component';

describe('BasicGeometriesComponent', () => {
  let component: BasicGeometriesComponent;
  let fixture: ComponentFixture<BasicGeometriesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [BasicGeometriesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BasicGeometriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
