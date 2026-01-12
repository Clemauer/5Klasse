import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { HightMapComponent } from '../components/hight-map/hight-map.component';

@Component({
    selector: 'app-tab4',
    templateUrl: 'tab4.page.html',
    styleUrls: ['tab4.page.scss'],
    standalone: true,
    imports: [IonHeader, IonToolbar, IonTitle, IonContent, HightMapComponent],
})
export class Tab4Page {
    public environmentInjector = inject(EnvironmentInjector);

    constructor() { }
}
