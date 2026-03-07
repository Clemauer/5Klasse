import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-three-js',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`:host { display: block; width: 100%; height: 100%; } canvas { width: 100%; height: 100%; display: block; }`],
})
export class ThreeJsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly terrainSize = 100;
  private readonly terrainSegments = 128;
  private readonly terrainMaxHeight = 15;
  private readonly runwayWidth = 6;
  private readonly runwayLength = 30;
  private readonly runwayCenter = new THREE.Vector3(0, 0, 0);
  private readonly runwayYOffset = 0.06;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId = 0;
  private controls!: OrbitControls;

  ngAfterViewInit() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.createLights();
    this.createTerrain();
    this.createWater();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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
    const geo = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, this.terrainSegments, this.terrainSegments);
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
        const u = pos.getX(i) / this.terrainSize + 0.5;
        const v = pos.getZ(i) / this.terrainSize + 0.5;
        const idx = (Math.floor(v * (c.height - 1)) * c.width + Math.floor(u * (c.width - 1))) * 4;
        pos.setY(i, (data[idx] / 255) * this.terrainMaxHeight);
      }

      c.width = c.height = 0;
      const airportHeights = this.flattenTerrainForAirport(geo);
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      this.createAirport(airportHeights);
    });
  }

  private createWater() {
    const geo = new THREE.PlaneGeometry(2000, 2000);
    geo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a6ea0 }));
    water.position.y = 0.5;
    this.scene.add(water);
  }

  private flattenTerrainArea(
    geometry: THREE.PlaneGeometry,
    centerX: number, centerZ: number,
    width: number, length: number,
    padding = 0
  ) {
    const pos = geometry.attributes['position'];
    const halfW = width / 2 + padding, halfL = length / 2 + padding;
    const indices: number[] = [];
    let sum = 0;

    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i) - centerX) <= halfW && Math.abs(pos.getZ(i) - centerZ) <= halfL) {
        indices.push(i);
        sum += pos.getY(i);
      }
    }

    const h = indices.length > 0 ? sum / indices.length : 0;
    for (const i of indices) pos.setY(i, h);
    return h;
  }

  private flattenTerrainForAirport(geometry: THREE.PlaneGeometry) {
    const runway = this.flattenTerrainArea(geometry, this.runwayCenter.x, this.runwayCenter.z, this.runwayWidth, this.runwayLength, 1);
    const tower = this.flattenTerrainArea(geometry, 8, this.runwayCenter.z, 3, 3, 0.75);
    const hangar = this.flattenTerrainArea(geometry, -8, -5, 9, 7, 0.75);
    const sideBuilding = this.flattenTerrainArea(geometry, -8, 5, 4, 4, 0.75);
    return { runway, tower, hangar, sideBuilding };
  }

  private addMesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }

  private createAirport(heights: { runway: number; tower: number; hangar: number; sideBuilding: number }) {
    const ry = heights.runway + this.runwayYOffset;
    const cx = this.runwayCenter.x, cz = this.runwayCenter.z;

    // Landebahn
    this.addMesh(new THREE.BoxGeometry(this.runwayWidth, 0.1, this.runwayLength),
      new THREE.MeshStandardMaterial({ color: 0x333333 }), cx, ry, cz);

    // Runway-Markierungen
    const markMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const markGeo = new THREE.BoxGeometry(1.5, 0.11, 1);
    for (const z of [-10, -5, 0, 5, 10]) this.addMesh(markGeo, markMat, cx, ry, cz + z);

    // Tower
    const ty = heights.tower;
    this.addMesh(new THREE.CylinderGeometry(1, 1, 6, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }), 8, ty + 3, cz);
    this.addMesh(new THREE.CylinderGeometry(2, 1.5, 2, 8), new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 }), 8, ty + 7, cz);
    this.addMesh(new THREE.ConeGeometry(2.5, 1, 8), new THREE.MeshStandardMaterial({ color: 0x555555 }), 8, ty + 8.5, cz);

    // Hangar
    this.addMesh(new THREE.BoxGeometry(8, 4, 6), new THREE.MeshStandardMaterial({ color: 0x996633 }), -8, heights.hangar + 2, -5);

    // Nebengebäude
    this.addMesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }), -8, heights.sideBuilding + 1, 5);

    // Runway-Lichter
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });
    const bulbGeo = new THREE.SphereGeometry(0.2);
    for (const side of [-3.5, 3.5])
      for (const z of [-12, 0, 12]) this.addMesh(bulbGeo, lightMat, side, ry + 0.2, cz + z);
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m.dispose());
      }
    });
    this.renderer.dispose();
  }
}
