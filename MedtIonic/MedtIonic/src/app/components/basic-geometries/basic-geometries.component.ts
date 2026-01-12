import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Scene, PerspectiveCamera, WebGLRenderer, BoxGeometry, TorusKnotGeometry, MeshBasicMaterial, Mesh, RingGeometry, DoubleSide, Curve, Vector3, TubeGeometry, TetrahedronGeometry, ConeGeometry } from 'three';



@Component({
  selector: 'app-basic-geometries',
  templateUrl: './basic-geometries.component.html',
  styleUrls: ['./basic-geometries.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class BasicGeometriesComponent implements OnInit, AfterViewInit {

  @ViewChild('three')
  canvas!: ElementRef;

  constructor() {

  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    const scene = new Scene();
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.position.z = 15;
    camera.position.y = 0;

    class CustomSinCurve extends Curve<Vector3> {
      private scale: number;

      constructor(scale: number = 1) {
        super();
        this.scale = scale;
      }

      override getPoint(t: number, optionalTarget = new Vector3()) {
        const tx = t * 3 - 1.5;
        const ty = Math.sin(2 * Math.PI * t);
        const tz = 0;
        return optionalTarget.set(tx, ty, tz);
      }
    }

    const renderer = new WebGLRenderer({ canvas: this.canvas.nativeElement });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const boxGeometry = new BoxGeometry(1, 1, 1, 1, 1, 1);
    const boxMaterial = new MeshBasicMaterial({ color: 0xff00ff });
    const box = new Mesh(boxGeometry, boxMaterial);
    box.position.set(-4, 2, 0);
    scene.add(box);

    const torusKnotGeometry = new TorusKnotGeometry(1, 0.3, 100, 16, 2, 3);
    const torusKnotMaterial = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const torusKnot = new Mesh(torusKnotGeometry, torusKnotMaterial);
    torusKnot.position.set(0, 2, 0);
    scene.add(torusKnot);

    const tetrahedronGeometry = new TetrahedronGeometry(1.5);
    const tetrahedronMaterial = new MeshBasicMaterial({ color: 0xffff00 });
    const tetrahedron = new Mesh(tetrahedronGeometry, tetrahedronMaterial);
    tetrahedron.position.set(4, 2, 0);
    scene.add(tetrahedron);

    const ringGeometry = new RingGeometry(0.5, 1.5, 32);
    const ringMaterial = new MeshBasicMaterial({ color: 0xff6600, side: DoubleSide });
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.position.set(-4, -2, 0);
    scene.add(ring);

    const path = new CustomSinCurve(10);
    const tubeGeometry = new TubeGeometry(path, 20, 0.2, 8, false);
    const tubeMaterial = new MeshBasicMaterial({ color: 0x0099ff });
    const tube = new Mesh(tubeGeometry, tubeMaterial);
    tube.position.set(0, -2, 0);
    scene.add(tube);

    const coneGeometry = new ConeGeometry(1, 2, 32);
    const coneMaterial = new MeshBasicMaterial({ color: 0x00ffff });
    const cone = new Mesh(coneGeometry, coneMaterial);
    cone.position.set(4, -2, 0);
    scene.add(cone);

    const animate = () => {
      requestAnimationFrame(animate);

      box.rotation.x += 0.01;
      box.rotation.y += 0.01;

      torusKnot.rotation.x += 0.005;
      torusKnot.rotation.y += 0.015;

      tetrahedron.rotation.x += 0.02;
      tetrahedron.rotation.y += 0.01;

      ring.rotation.x += 0.01;
      ring.rotation.z += 0.01;

      tube.rotation.y += 0.008;
      tube.rotation.z += 0.005;

      cone.rotation.x += 0.015;
      cone.rotation.y += 0.02;

      renderer.render(scene, camera);
    };

    animate();
  }
}
