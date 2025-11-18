import { Component } from '@angular/core';
import { BasicGeometriesComponent } from '../components/basic-geometries/basic-geometries.component';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [BasicGeometriesComponent],
})
export class Tab3Page {
  constructor() {}
}
