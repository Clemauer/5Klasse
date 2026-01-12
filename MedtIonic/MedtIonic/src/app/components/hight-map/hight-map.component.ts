import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Scene, PerspectiveCamera, Vector3, Curve, WebGLRenderer, BoxGeometry, MeshBasicMaterial, Mesh, TextureLoader } from 'three';

@Component({
  selector: 'app-hight-map',
  templateUrl: './hight-map.component.html',
  styleUrls: ['./hight-map.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class HightMapComponent implements OnInit {

  width = 640;
  height = 480;

  @ViewChild('canvas')
  canvas!: ElementRef;

  constructor() { }

  async ngAfterViewInit() {
    const scene = new Scene();
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.position.z = 15;
    camera.position.y = 0;

    const renderer = new WebGLRenderer({ canvas: this.canvas.nativeElement });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const loader = new TextureLoader();
    const texture = await loader.loadAsync('../../assets/3x3.png');

    const canvasTexture = document.createElement('canvas');
    canvasTexture.width = texture.image.width;
    canvasTexture.height = texture.image.height;
    const context2d = canvasTexture.getContext('2d') as CanvasRenderingContext2D;
    context2d.drawImage(texture.image, 0, 0);
    
    const image = context2d.getImageData(0, 0, canvasTexture.width, canvasTexture.height);
    console.log(image);
    
    renderer.render(scene, camera);
  }

  ngOnInit() { }

}
