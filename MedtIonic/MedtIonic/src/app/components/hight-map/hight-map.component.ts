import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  TextureLoader,
  BufferGeometry,
  BufferAttribute,
  MeshStandardMaterial,
  Mesh,
  DirectionalLight
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-hight-map',
  templateUrl: './hight-map.component.html',
  styleUrls: ['./hight-map.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class HightMapComponent implements OnInit, AfterViewInit {

  @ViewChild('canvas')
  canvas!: ElementRef;

  width: number = window.innerWidth;
  height: number = window.innerHeight;

  camera!: PerspectiveCamera;
  controls!: OrbitControls;
  renderer!: WebGLRenderer;
  scene!: Scene;

  constructor() { }

  async ngAfterViewInit(): Promise<void> {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.x = -20;
    this.camera.position.y = 100;
    this.camera.position.z = 400;
    this.camera.lookAt(0, 0, 0);

    this.renderer = new WebGLRenderer({ canvas: this.canvas.nativeElement });
    this.renderer.setSize(this.width, this.height);

    this.controls = new OrbitControls(this.camera, this.canvas.nativeElement);

    const loader = new TextureLoader();
    const texture = await loader.loadAsync('/assets/3x3.png');

    const canvasTexture = document.createElement('canvas');
    canvasTexture.width = texture.image.width;
    canvasTexture.height = texture.image.height;

    const context2d = canvasTexture.getContext('2d') as CanvasRenderingContext2D;
    context2d.drawImage(texture.image, 0, 0);

    const imageData = context2d.getImageData(0, 0, canvasTexture.width, canvasTexture.height);
    console.log(imageData);

    const colorInfos = [[0.38, 0.68, 0.3], [0.91, 0.58, 0.41], [1, 1, 1]];
    const vertices = [];
    const colors = [];

    for (let z = 0; z < imageData.height; z++) {
      for (let x = 0; x < imageData.width; x++) {
        const index = x * 4 + z * imageData.width * 4;
        const y = imageData.data[index] / 255;
        vertices.push(x - imageData.width / 2);
        vertices.push(y * 10);
        vertices.push(z - imageData.height / 2);

        if (y <= 0.5) {
          colors.push(...colorInfos[0], 1);
        } else if (y > 0.5 && y <= 0.8) {
          colors.push(...colorInfos[1], 1);
        } else {
          colors.push(...colorInfos[2], 1);
        }
      }
    }

    const indices = [];
    for (let j = 0; j < imageData.height - 1; j++) {
      let offset = j * imageData.width;
      for (let i = offset; i < offset + imageData.width - 1; i++) {
        indices.push(i);
        indices.push(i + imageData.width);
        indices.push(i + 1);

        indices.push(i + 1);
        indices.push(i + imageData.width);
        indices.push(i + 1 + imageData.width);
      }
    }

    const geometry = new BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 4));
    geometry.computeVertexNormals();

    const material = new MeshStandardMaterial();
    material.vertexColors = true;
    material.wireframe = false;

    const map = new Mesh(geometry, material);
    this.scene.add(map);

    const light = new DirectionalLight(0xffffff, 2);
    light.position.set(-10, 1, 0);
    light.target = map;
    this.scene.add(light);

    requestAnimationFrame(() => this.animate());
  }

  animate() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  ngOnInit() { }
}
