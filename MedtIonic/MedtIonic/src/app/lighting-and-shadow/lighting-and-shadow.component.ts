import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { AmbientLight, Clock, DirectionalLight, Mesh, MeshPhongMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry.js';

@Component({
  selector: 'app-lighting-and-shadow',
  templateUrl: './lighting-and-shadow.component.html',
  styleUrls: ['./lighting-and-shadow.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class LightingAndShadowComponent  implements OnInit, AfterViewInit {

  @ViewChild('glcanvas')
  canvas!: ElementRef;

  width: number = 640;
  height: number = 480;

  camera!: PerspectiveCamera;
  controls!: OrbitControls;
  renderer!: WebGLRenderer;
  scene!: Scene;
  clock!: Clock;
  ambientLight!: AmbientLight;
  directionalLight!: DirectionalLight;
  
  constructor() { }

  ngOnInit(): void {
  }

  async ngAfterViewInit(): Promise<void> {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.x = 0;
    this.camera.position.y = 5;
    this.camera.position.z = 10;
    this.camera.lookAt(0, 0, 0);

    this.renderer = new WebGLRenderer({canvas: this.canvas.nativeElement});
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;

    const planeGeometry = new PlaneGeometry(10, 10);
    const planeMaterial = new MeshStandardMaterial({ color: 0x33ff99 });
    const plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotateX(-90 / 180 * Math.PI);
    plane.receiveShadow = true;
    this.scene.add(plane);
    const teapotGeometry = new TeapotGeometry(1);
    const teapotMaterial = new MeshPhongMaterial({ color: 0xffff00, specular: 0xffffff });
    const teapot = new Mesh(teapotGeometry, teapotMaterial);
    teapot.rotateY(-90 / 180 * Math.PI);
    teapot.position.y = 1;
    teapot.castShadow = true;
    this.scene.add(teapot);

    this.ambientLight = new AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambientLight);

    this.directionalLight = new DirectionalLight(0xffffff, 1);
    this.directionalLight.position.x = 5;
    this.directionalLight.position.y = 5;
    this.directionalLight.target = teapot;
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(512, 512);
    this.scene.add(this.directionalLight);

    this.clock = new Clock(true);
    requestAnimationFrame(() => this.animate());
  }

  animate() {

    this.directionalLight.rotateY(100);
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.animate());
  }
}
