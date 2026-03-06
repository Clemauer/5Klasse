import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-three-js',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`:host { display: block; width: 100%; height: 100%; } canvas { width: 100%; height: 100%; display: block; }`],
})
export class ThreeJsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId = 0;

  ngAfterViewInit() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.createLights();
    this.createTerrain();
    this.createWater();
    this.animate();
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
  }

  private initCamera() {
    const w = this.canvasRef.nativeElement.clientWidth || window.innerWidth;
    const h = this.canvasRef.nativeElement.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    this.camera.position.set(0, 40, 60);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  private createLights() {
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 5);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  }

  private createTerrain() {
    const size = 100, segs = 128, maxH = 15;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4a7c2e }));
    this.scene.add(terrain);

    new THREE.TextureLoader().load('assets/heightmap.png', (tex) => {
      const c = document.createElement('canvas');
      c.width = tex.image.width;
      c.height = tex.image.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(tex.image, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const pos = geo.attributes['position'];

      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / size + 0.5;
        const v = pos.getZ(i) / size + 0.5;
        const idx = (Math.floor(v * (c.height - 1)) * c.width + Math.floor(u * (c.width - 1))) * 4;
        pos.setY(i, (data[idx] / 255) * maxH);
      }

      pos.needsUpdate = true;
      geo.computeVertexNormals();
    });
  }

  private createWater() {
    const geo = new THREE.PlaneGeometry(2000, 2000);
    geo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a6ea0 }));
    water.position.y = 0.5;
    this.scene.add(water);
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}
