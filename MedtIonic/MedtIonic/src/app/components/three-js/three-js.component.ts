import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as dat from 'dat.gui';

@Component({
  selector: 'app-three-js',
  standalone: true,
  template: `
    <canvas #canvas></canvas>
    <div #hud class="hud"></div>
    <div class="controls-hint">W/S: Pitch | A/D: Steuern | E/Q: Throttle +/-</div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; position: relative; }
    canvas { width: 100%; height: 100%; display: block; }
    .hud {
      position: absolute; top: 10px; left: 10px;
      background: rgba(0,0,0,0.6); color: #0f0;
      padding: 10px 14px; border-radius: 6px;
      font: bold 14px monospace; line-height: 1.6;
      pointer-events: none;
    }
    .controls-hint {
      position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.5); color: white;
      padding: 6px 14px; border-radius: 4px;
      font: 12px monospace; pointer-events: none; white-space: nowrap;
    }
  `],
})
export class ThreeJsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('hud') hudRef!: ElementRef<HTMLDivElement>;

  // --- Terrain constants ---
  private readonly terrainSize = 100;
  private readonly terrainSegments = 128;
  private readonly terrainMaxHeight = 15;

  // --- Runway constants ---
  private readonly runwayWidth = 6;
  private readonly runwayLength = 30;
  private readonly runwayCenter = new THREE.Vector3(0, 0, 0);
  private readonly runwayYOffset = 0.06;

  // --- Three.js core objects ---
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId = 0;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();

  // --- Lights (stored for day/night system) ---
  private sun!: THREE.DirectionalLight;
  private runwayLights: THREE.PointLight[] = [];
  private towerLight!: THREE.PointLight;
  private sky!: Sky;

  // --- GUI ---
  private gui!: dat.GUI;
  guiParams = { timeOfDay: 12, cameraMode: 'Follow' };

  // --- Airplane & flight state ---
  private airplane?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private runwayHeight = 0;

  // Flight physics state
  private throttle = 0;
  private airspeed = 0;
  private altitude = 0;
  private verticalSpeed = 0;
  private isAirborne = false;
  private keys: Record<string, boolean> = {};

  // Flight physics constants
  private readonly LIFTOFF_SPEED = 30;
  private readonly STALL_SPEED = 20;
  private readonly MAX_SPEED = 100;
  private readonly GRAVITY = 9.81;
  private readonly THRUST_FACTOR = 0.5;
  private readonly DRAG_FACTOR = 0.08;
  private readonly GROUND_FRICTION = 0.15;
  private readonly BRAKE_FORCE = 25;

  // Keyboard handlers (stored references for cleanup)
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    this.keys[e.key.toLowerCase()] = true;
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  ngAfterViewInit() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.createLights();
    this.createTerrain();
    this.createWater();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.initGUI();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.animate();
  }

  private initScene() {
    this.scene = new THREE.Scene();
  }

  private initCamera() {
    const w = this.canvasRef.nativeElement.clientWidth || window.innerWidth;
    const h = this.canvasRef.nativeElement.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 2000);
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
  }

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

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
  }

  private createTerrain() {
    const geo = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, this.terrainSegments, this.terrainSegments);
    geo.rotateX(-Math.PI / 2);
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4a7c2e }));
    terrain.receiveShadow = true;
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
      this.createTrees(geo);
      this.createRocks(geo);
      this.createClouds();
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
    const h = this.flattenTerrainArea(geometry, 0, 0, 20, this.runwayLength + 2, 2);
    return { runway: h, tower: h, hangar: h, sideBuilding: h };
  }

  private addMesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  private createAirport(heights: { runway: number; tower: number; hangar: number; sideBuilding: number }) {
    const ry = heights.runway + this.runwayYOffset;
    this.runwayHeight = ry;
    const cx = this.runwayCenter.x, cz = this.runwayCenter.z;

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

    const markMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const markGeo = new THREE.BoxGeometry(1.5, 0.11, 1);
    for (const z of [-10, -5, 0, 5, 10]) this.addMesh(markGeo, markMat, cx, ry, cz + z);

    const ty = heights.tower;
    this.addMesh(new THREE.CylinderGeometry(1, 1, 6, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }), 8, ty + 3, cz);
    this.addMesh(new THREE.CylinderGeometry(2, 1.5, 2, 8), new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 }), 8, ty + 7, cz);
    this.addMesh(new THREE.ConeGeometry(2.5, 1, 8), new THREE.MeshStandardMaterial({ color: 0x555555 }), 8, ty + 8.5, cz);

    this.addMesh(new THREE.BoxGeometry(8, 4, 6), new THREE.MeshStandardMaterial({ color: 0x996633 }), -8, heights.hangar + 2, -5);

    this.addMesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }), -8, heights.sideBuilding + 1, 5);

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

    this.towerLight = new THREE.PointLight(0xff0000, 1, 30);
    this.towerLight.position.set(8, ty + 9.5, cz);
    this.scene.add(this.towerLight);

    this.loadAirplane(ry);
  }

  // Loads the airplane GLB model and sets up propeller animation
  private loadAirplane(groundY: number) {
    new GLTFLoader().load('assets/airplane.glb', (gltf) => {
      this.airplane = gltf.scene;
      this.airplane.scale.setScalar(1);
      this.airplane.position.set(0, groundY + 0.5, -this.runwayLength / 2 + 2);
      this.airplane.rotation.set(0, 0, 0);

      this.airplane.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene.add(this.airplane);

      // Play all Blender animations at normal speed
      if (gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.airplane);
        for (const clip of gltf.animations) {
          this.mixer.clipAction(clip).play();
        }
      }
    });
  }

  private getTerrainHeight(geometry: THREE.PlaneGeometry, x: number, z: number): number {
    const pos = geometry.attributes['position'];
    const col = Math.round((x / this.terrainSize + 0.5) * this.terrainSegments);
    const row = Math.round((z / this.terrainSize + 0.5) * this.terrainSegments);
    const i = row * (this.terrainSegments + 1) + col;
    return pos.getY(i);
  }

  private createTrees(terrainGeo: THREE.PlaneGeometry) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
    const leafGeo = new THREE.ConeGeometry(1.5, 3, 6);

    const positions = [
      [20, 5], [22, -8], [18, 12], [-20, 10], [-22, -12],
      [25, -15], [-18, 18], [15, -20], [-25, -5], [28, 0],
      [-15, -22], [30, 10], [-28, 8], [12, 22], [-12, -25],
    ];

    for (const [x, z] of positions) {
      const y = this.getTerrainHeight(terrainGeo, x, z);
      if (y < 1) continue;
      this.addMesh(trunkGeo, trunkMat, x, y + 1, z);
      this.addMesh(leafGeo, leafMat, x, y + 3.5, z);
    }
  }

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

  private createClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

    const cloudPositions = [
      [0, 35, -20], [20, 38, 10], [-25, 33, -15], [30, 36, 25],
      [-15, 40, 20], [10, 34, -30], [-30, 37, 0],
    ];

    const sphereGeo = new THREE.SphereGeometry(1, 8, 6);

    for (const [cx, cy, cz] of cloudPositions) {
      const group = new THREE.Group();
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const r = 1.5 + Math.random() * 2;
        const sphere = new THREE.Mesh(sphereGeo, cloudMat);
        sphere.position.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 4
        );
        sphere.scale.set(r, r * 0.6, r);
        group.add(sphere);
      }
      group.position.set(cx, cy, cz);
      this.scene.add(group);
    }
  }

  private initGUI() {
    this.gui = new dat.GUI();
    this.gui.add(this.guiParams, 'timeOfDay', 0, 24, 0.1).name('Uhrzeit');
    this.gui.add(this.guiParams, 'cameraMode', ['Orbit', 'Follow']).name('Kamera').onChange((mode: string) => {
      this.controls.enabled = mode === 'Orbit';
      if (mode === 'Orbit' && this.airplane) {
        this.controls.target.copy(this.airplane.position);
      }
    });
  }

  // Updates throttle, airspeed, propeller, rotation and position each frame
  private updateFlight(dt: number) {
    if (!this.airplane) return;

    if (this.keys['e']) this.throttle = Math.min(100, this.throttle + 30 * dt);
    if (this.keys['q']) this.throttle = Math.max(0, this.throttle - 30 * dt);

    const thrust = this.throttle * this.THRUST_FACTOR;
    const drag = this.airspeed * this.DRAG_FACTOR;
    const groundFriction = this.isAirborne ? 0 : this.airspeed * this.GROUND_FRICTION;
    const brake = 0;
    this.airspeed += (thrust - drag - groundFriction - brake) * dt;
    this.airspeed = Math.max(0, Math.min(this.MAX_SPEED, this.airspeed));

    if (this.mixer) this.mixer.update(dt);

    const pitchRate = 1.2;
    const yawRate = 1.5;
    const rollRate = 2.0;

    if (this.isAirborne) {
      if (this.keys['w']) this.airplane.rotateX(-pitchRate * dt);
      if (this.keys['s']) this.airplane.rotateX(pitchRate * dt);

      if (this.keys['a']) {
        this.airplane.rotateZ(rollRate * dt);
        this.airplane.rotateY(yawRate * dt);
      }
      if (this.keys['d']) {
        this.airplane.rotateZ(-rollRate * dt);
        this.airplane.rotateY(-yawRate * dt);
      }

      // Auto-level roll: extract euler, dampen roll, reapply
      const euler = new THREE.Euler().setFromQuaternion(this.airplane.quaternion, 'YXZ');
      euler.z *= 0.97;
      this.airplane.quaternion.setFromEuler(euler);

      // Move along the airplane's local forward (+Z) direction
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.airplane.quaternion);
      this.airplane.position.addScaledVector(forward, this.airspeed * dt);

      // Lift counters gravity proportional to airspeed squared
      const liftRatio = Math.min(1, (this.airspeed * this.airspeed) / (this.LIFTOFF_SPEED * this.LIFTOFF_SPEED));
      const effectiveGravity = this.GRAVITY * (1 - liftRatio * 0.85);
      this.verticalSpeed -= effectiveGravity * dt;
      this.airplane.position.y += this.verticalSpeed * dt;

      // Ground collision / landing
      if (this.airplane.position.y <= this.runwayHeight + 0.5) {
        this.airplane.position.y = this.runwayHeight + 0.5;
        this.isAirborne = false;
        this.verticalSpeed = 0;
        this.airplane.rotation.x = 0;
        this.airplane.rotation.z = 0;
      }
    } else {
      // Ground mode: yaw steering only
      if (this.keys['a']) this.airplane.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), yawRate * dt);
      if (this.keys['d']) this.airplane.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -yawRate * dt);

      // Roll forward on the ground plane
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.airplane.quaternion);
      forward.y = 0;
      forward.normalize();
      this.airplane.position.addScaledVector(forward, this.airspeed * dt);
      this.airplane.position.y = this.runwayHeight + 0.5;

      // Liftoff when fast enough and player pulls up
      if (this.airspeed >= this.LIFTOFF_SPEED && this.keys['w']) {
        this.isAirborne = true;
        this.verticalSpeed = 3;
      }
    }

    this.altitude = Math.max(0, this.airplane.position.y - this.runwayHeight);
  }

  // Positions the camera behind and above the airplane with smooth interpolation
  private updateFollowCamera() {
    if (!this.airplane || this.guiParams.cameraMode !== 'Follow') return;

    const offset = new THREE.Vector3(0, 4, -12);
    offset.applyQuaternion(this.airplane.quaternion);
    const targetPos = this.airplane.position.clone().add(offset);
    this.camera.position.lerp(targetPos, 0.05);

    const lookAhead = new THREE.Vector3(0, 1, 10);
    lookAhead.applyQuaternion(this.airplane.quaternion);
    const lookTarget = this.airplane.position.clone().add(lookAhead);
    this.camera.lookAt(lookTarget);
  }

  private updateHUD() {
    if (!this.hudRef) return;
    this.hudRef.nativeElement.innerHTML =
      `Speed: ${Math.round(this.airspeed)} kt<br>` +
      `Alt: ${Math.round(this.altitude)} ft<br>` +
      `Throttle: ${Math.round(this.throttle)}%`;
  }

  private updateDayNight() {
    const t = this.guiParams.timeOfDay;

    const sunAngle = ((t - 6) / 12) * Math.PI;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);
    this.sun.position.set(sunX * 80, sunY * 80, 24);

    this.sky.material.uniforms['sunPosition'].value.copy(this.sun.position);

    const dayFactor = Math.max(0, sunY);
    this.sun.intensity = dayFactor;

    const runwayIntensity = 1 - dayFactor;
    for (const light of this.runwayLights) {
      light.intensity = runwayIntensity * 1.5;
    }

    if (this.towerLight) {
      this.towerLight.intensity = Math.sin(Date.now() * 0.005) > 0 ? runwayIntensity * 2 : 0;
    }
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.updateDayNight();
    this.updateFlight(dt);
    this.updateHUD();

    const useOrbit = this.guiParams.cameraMode === 'Orbit' || !this.airplane;
    this.controls.enabled = useOrbit;
    if (useOrbit) {
      this.controls.update();
    } else {
      this.updateFollowCamera();
    }

    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.gui.destroy();
    this.controls.dispose();
    if (this.mixer) this.mixer.stopAllAction();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.renderer.dispose();
  }
}
