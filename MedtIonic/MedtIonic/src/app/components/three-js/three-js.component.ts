import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import * as dat from 'dat.gui';

@Component({
  selector: 'app-three-js',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`:host { display: block; width: 100%; height: 100%; } canvas { width: 100%; height: 100%; display: block; }`],
})
export class ThreeJsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // --- Terrain constants ---
  private readonly terrainSize = 100;        // width/depth of the terrain in 3D units
  private readonly terrainSegments = 128;    // number of subdivisions (more = more detail)
  private readonly terrainMaxHeight = 15;    // maximum hill height

  // --- Runway constants ---
  private readonly runwayWidth = 6;
  private readonly runwayLength = 30;
  private readonly runwayCenter = new THREE.Vector3(0, 0, 0); // center point of the runway
  private readonly runwayYOffset = 0.06;     // small offset so the runway sits on top of the terrain

  // --- Three.js core objects ---
  private renderer!: THREE.WebGLRenderer;   // draws the scene onto the canvas
  private scene!: THREE.Scene;              // holds all 3D objects
  private camera!: THREE.PerspectiveCamera; // the viewer's point of view
  private animationId = 0;                  // ID of the running animation loop (needed for cleanup)
  private controls!: OrbitControls;         // mouse controls for rotating/zooming the camera

  // --- Lights (stored for day/night system) ---
  private sun!: THREE.DirectionalLight;
  private runwayLights: THREE.PointLight[] = [];
  private towerLight!: THREE.PointLight;
  private sky!: Sky;

  // --- GUI ---
  private gui!: dat.GUI;
  guiParams = { timeOfDay: 12, flightSpeed: 50 };

  // Entry point: called once the canvas is available in the DOM
  ngAfterViewInit() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.createLights();
    this.createTerrain();
    this.createWater();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.initGUI();
    this.animate();
  }

  private initScene() {
    this.scene = new THREE.Scene();
  }

  // Creates the perspective camera with correct aspect ratio
  private initCamera() {
    const w = this.canvasRef.nativeElement.clientWidth || window.innerWidth;
    const h = this.canvasRef.nativeElement.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 2000);
    this.camera.position.set(0, 40, 60);
    this.camera.lookAt(0, 0, 0);
  }

  // Creates the WebGL renderer and binds it to the canvas element
  private initRenderer() {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
  }

  // Adds a sun (DirectionalLight) and soft ambient light (AmbientLight)
  private createLights() {
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.position.set(50, 80, 50);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -60;
    this.sun.shadow.camera.right = 60;
    this.sun.shadow.camera.top = 60;
    this.sun.shadow.camera.bottom = -60;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 200;
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Procedural sky with built-in sun
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
  }

  // Creates the island terrain: plane mesh deformed by a heightmap
  private createTerrain() {
    const geo = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, this.terrainSegments, this.terrainSegments);
    geo.rotateX(-Math.PI / 2); // Plane ist standardmäßig vertikal, drehen auf horizontal
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4a7c2e }));
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    // Load heightmap: pixel brightness controls the Y position of each vertex
    new THREE.TextureLoader().load('assets/heightmap.png', (tex) => {
      const c = document.createElement('canvas');
      c.width = tex.image.width;
      c.height = tex.image.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(tex.image, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const pos = geo.attributes['position'];

      // Displace each vertex based on the corresponding heightmap pixel
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / this.terrainSize + 0.5; // UV coordinate (0–1)
        const v = pos.getZ(i) / this.terrainSize + 0.5;
        const idx = (Math.floor(v * (c.height - 1)) * c.width + Math.floor(u * (c.width - 1))) * 4;
        pos.setY(i, (data[idx] / 255) * this.terrainMaxHeight); // brightness → height
      }

      c.width = c.height = 0; // free canvas memory
      const airportHeights = this.flattenTerrainForAirport(geo); // flatten airport areas
      pos.needsUpdate = true;
      geo.computeVertexNormals(); // recalculate lighting normals
      this.createAirport(airportHeights);
      this.createTrees(geo);
      this.createRocks(geo);
      this.createClouds();
    });
  }

  // Creates a huge flat water plane surrounding the island
  private createWater() {
    const geo = new THREE.PlaneGeometry(2000, 2000);
    geo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a6ea0 }));
    water.position.y = 0.5;
    this.scene.add(water);
  }

  // Flattens a rectangular terrain area to its average height
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

    // Collect all vertices in range and calculate their average height
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i) - centerX) <= halfW && Math.abs(pos.getZ(i) - centerZ) <= halfL) {
        indices.push(i);
        sum += pos.getY(i);
      }
    }

    const h = indices.length > 0 ? sum / indices.length : 0;
    for (const i of indices) pos.setY(i, h); // set all matched vertices to average height
    return h;
  }

  // Flattens the entire airport area to one uniform height
  private flattenTerrainForAirport(geometry: THREE.PlaneGeometry) {
    const h = this.flattenTerrainArea(geometry, 0, 0, 20, this.runwayLength + 2, 2);
    return { runway: h, tower: h, hangar: h, sideBuilding: h };
  }

  // Helper: create a mesh, position it and add it to the scene
  private addMesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  // Creates all airport objects: runway, tower, hangar, side building, lights
  private createAirport(heights: { runway: number; tower: number; hangar: number; sideBuilding: number }) {
    const ry = heights.runway + this.runwayYOffset; // Y position of the runway surface
    const cx = this.runwayCenter.x, cz = this.runwayCenter.z;

    // Runway (dark asphalt with normal map for surface detail)
    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    new THREE.TextureLoader().load('assets/asphalt-normal.jpg', (normalTex) => {
      normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
      normalTex.repeat.set(2, 10);
      runwayMat.normalMap = normalTex;
      runwayMat.normalScale = new THREE.Vector2(3, 3);
      runwayMat.needsUpdate = true;
    });
    this.addMesh(new THREE.BoxGeometry(this.runwayWidth, 0.1, this.runwayLength),
      runwayMat, cx, ry, cz);

    // White centerline markings
    const markMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const markGeo = new THREE.BoxGeometry(1.5, 0.11, 1);
    for (const z of [-10, -5, 0, 5, 10]) this.addMesh(markGeo, markMat, cx, ry, cz + z);

    // Control tower: base cylinder + glass cab + cone roof
    const ty = heights.tower;
    this.addMesh(new THREE.CylinderGeometry(1, 1, 6, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }), 8, ty + 3, cz);
    this.addMesh(new THREE.CylinderGeometry(2, 1.5, 2, 8), new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 }), 8, ty + 7, cz);
    this.addMesh(new THREE.ConeGeometry(2.5, 1, 8), new THREE.MeshStandardMaterial({ color: 0x555555 }), 8, ty + 8.5, cz);

    // Hangar
    this.addMesh(new THREE.BoxGeometry(8, 4, 6), new THREE.MeshStandardMaterial({ color: 0x996633 }), -8, heights.hangar + 2, -5);

    // Side building
    this.addMesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }), -8, heights.sideBuilding + 1, 5);

    // Runway lights: 3 yellow spheres on each side + PointLights
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });
    const bulbGeo = new THREE.SphereGeometry(0.2);
    for (const side of [-3.5, 3.5]) {
      for (const z of [-12, 0, 12]) {
        this.addMesh(bulbGeo, lightMat, side, ry + 0.2, cz + z);
        const pl = new THREE.PointLight(0xffff00, 0.5, 15);
        pl.position.set(side, ry + 0.4, cz + z);
        this.scene.add(pl);
        this.runwayLights.push(pl);
      }
    }

    // Tower beacon light
    this.towerLight = new THREE.PointLight(0xff0000, 1, 30);
    this.towerLight.position.set(8, ty + 9.5, cz);
    this.scene.add(this.towerLight);
  }

  // Returns the terrain height at a given (x, z) position using direct grid index lookup
  private getTerrainHeight(geometry: THREE.PlaneGeometry, x: number, z: number): number {
    const pos = geometry.attributes['position'];
    const col = Math.round((x / this.terrainSize + 0.5) * this.terrainSegments);
    const row = Math.round((z / this.terrainSize + 0.5) * this.terrainSegments);
    const i = row * (this.terrainSegments + 1) + col;
    return pos.getY(i);
  }

  // Creates trees
  private createTrees(terrainGeo: THREE.PlaneGeometry) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
    const leafGeo = new THREE.ConeGeometry(1.5, 3, 6);

    // Tree positions
    const positions = [
      [20, 5], [22, -8], [18, 12], [-20, 10], [-22, -12],
      [25, -15], [-18, 18], [15, -20], [-25, -5], [28, 0],
      [-15, -22], [30, 10], [-28, 8], [12, 22], [-12, -25],
    ];

    for (const [x, z] of positions) {
      const y = this.getTerrainHeight(terrainGeo, x, z);
      // skip positions that are at water level
      if (y < 1) continue; 
      this.addMesh(trunkGeo, trunkMat, x, y + 1, z);
      this.addMesh(leafGeo, leafMat, x, y + 3.5, z);
    }
  }

  // Creates rocks
  private createRocks(terrainGeo: THREE.PlaneGeometry) {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x777777, flatShading: true });
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);

    const rockPositions: [number, number][] = [
      [25, 15], [-20, -18], [30, -10], [-30, 5],
      [15, 25], [-25, 20], [35, 0], [-10, 30],
    ];

    for (const [x, z] of rockPositions) {
      const y = this.getTerrainHeight(terrainGeo, x, z);
      if (y < 1) continue;
      const scale = 0.5 + Math.random() * 1.2;
      const mesh = this.addMesh(rockGeo, rockMat, x, y + scale * 0.4, z);
      mesh.scale.setScalar(scale);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    }
  }

  // Creates soft cloud clusters 
  private createClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

    const cloudPositions = [
      [0, 35, -20], [20, 38, 10], [-25, 33, -15], [30, 36, 25],
      [-15, 40, 20], [10, 34, -30], [-30, 37, 0],
    ];

    const sphereGeo = new THREE.SphereGeometry(1, 8, 6);

    for (const [cx, cy, cz] of cloudPositions) {
      const group = new THREE.Group();
      // Each cloud is 3–5 overlapping spheres
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const r = 1.5 + Math.random() * 2;
        const sphere = new THREE.Mesh(sphereGeo, cloudMat);
        sphere.position.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 4
        );
        // scale and flatten
        sphere.scale.set(r, r * 0.6, r);
        group.add(sphere);
      }
      group.position.set(cx, cy, cz);
      this.scene.add(group);
    }
  }

  // Creates the dat.GUI panel with time and speed controls
  private initGUI() {
    this.gui = new dat.GUI();
    this.gui.add(this.guiParams, 'timeOfDay', 0, 24, 0.1).name('Uhrzeit');
    this.gui.add(this.guiParams, 'flightSpeed', 0, 100, 1).name('Fluggeschwindigkeit');
  }

  // Updates lighting, sky and runway lights based on the current time of day
  private updateDayNight() {
    const t = this.guiParams.timeOfDay;

    // Sun angle: rises at 6, peaks at 12, sets at 18
    const sunAngle = ((t - 6) / 12) * Math.PI;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);
    this.sun.position.set(sunX * 80, sunY * 80, 24);

    // Update Sky shader sun position
    this.sky.material.uniforms['sunPosition'].value.copy(this.sun.position);

    // Sun intensity: full during day, zero at night
    const dayFactor = Math.max(0, sunY);
    this.sun.intensity = dayFactor;

    // Runway lights: brighter at night
    const runwayIntensity = 1 - dayFactor;
    for (const light of this.runwayLights) {
      light.intensity = runwayIntensity * 1.5;
    }

    // Tower beacon blinks on/off every second
    this.towerLight.intensity = Math.sin(Date.now() * 0.005) > 0 ? runwayIntensity * 2 : 0;
  }

  // Animation loop: runs every frame, updates camera controls and renders the scene
  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.updateDayNight();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  // Cleanup when the component is destroyed: free GPU resources
  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
    this.gui.destroy();
    this.controls.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.renderer.dispose();
  }
}
