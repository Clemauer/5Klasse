import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {Scene, PerspectiveCamera, WebGLRenderer} from 'three';



@Component({
  selector: 'app-basic-geometries',
  templateUrl: './basic-geometries.component.html',
  styleUrls: ['./basic-geometries.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class BasicGeometriesComponent  implements OnInit, AfterViewInit {

  @ViewChild('three')
  canvas!: ElementRef;  
  
    constructor() {
  
  }

  ngOnInit() {

    // document.body.appendChild( renderer.domElement );
  }

  ngAfterViewInit() {
    const scene = new Scene();
    const camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    const renderer = new WebGLRenderer({ canvas: this.canvas.nativeElement });
    renderer.setSize( window.innerWidth, window.innerHeight );

    renderer.render(scene, camera);
  }

}
