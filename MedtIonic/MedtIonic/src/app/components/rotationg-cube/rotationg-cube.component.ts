import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mat4 } from 'gl-matrix';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-rotationg-cube',
  templateUrl: './rotationg-cube.component.html',
  styleUrls: ['./rotationg-cube.component.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule]
})
export class RotationgCubeComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('glCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private gl: WebGLRenderingContext | null = null;
  private programInfo: any;
  private buffers: any;
  private cubeRotation = 0.0;
  private deltaTime = 0;
  private then = 0;
  private animationFrameId: number | null = null;
  public rotationSpeed = 1.0;

  private vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
  `;

  private fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

  constructor() { }

  ngOnInit() {}

  ngAfterViewInit() {
    this.main();
  }

  ngOnDestroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private main() {
    const canvas = this.canvasRef.nativeElement;
    this.gl = canvas.getContext("webgl");
    
    if (this.gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }

    const shaderProgram = this.initShaderProgram(this.gl, this.vsSource, this.fsSource);

    this.programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        vertexColor: this.gl.getAttribLocation(shaderProgram, "aVertexColor"),
      },
      uniformLocations: {
        projectionMatrix: this.gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
        modelViewMatrix: this.gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      },
    };

    this.buffers = this.initBuffers(this.gl);

    this.render(0);
  }

  private render = (now: number) => {
    now *= 0.001;
    this.deltaTime = now - this.then;
    this.then = now;

    if (this.gl) {
      this.drawScene(this.gl, this.programInfo, this.buffers, this.cubeRotation);
      this.cubeRotation += this.deltaTime * this.rotationSpeed;
    }

    this.animationFrameId = requestAnimationFrame(this.render);
  }

  public onSpeedChange(event: any) {
    this.rotationSpeed = event.detail.value;
  }

  private initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram {
    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram()!;
    gl.attachShader(shaderProgram, vertexShader!);
    gl.attachShader(shaderProgram, fragmentShader!);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
      return null!;
    }

    return shaderProgram;
  }

  private loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type)!;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private initBuffers(gl: WebGLRenderingContext) {
    const positionBuffer = this.initPositionBuffer(gl);
    const colorBuffer = this.initColorBuffer(gl);
    const indexBuffer = this.initIndexBuffer(gl);
    return {
      position: positionBuffer,
      color: colorBuffer,
      indices: indexBuffer,
    };
  }

  private initPositionBuffer(gl: WebGLRenderingContext) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    const positions = [
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
      -1.0,  1.0, -1.0,
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    return positionBuffer;
  }

  private initColorBuffer(gl: WebGLRenderingContext) {
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    
    const colors = [
      0.0, 0.0, 0.0, 1.0,
      1.0, 0.0, 0.0, 1.0,
      1.0, 1.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      1.0, 0.0, 1.0, 1.0,
      0.0, 1.0, 1.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0,
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    return colorBuffer;
  }

  private initIndexBuffer(gl: WebGLRenderingContext) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   
    const indices = [
      4, 5, 6,  4, 6, 7,
      1, 0, 3,  1, 3, 2,
      7, 6, 2,  7, 2, 3,
      4, 0, 1,  4, 1, 5,
      5, 1, 2,  5, 2, 6,
      0, 4, 7,  0, 7, 3,
    ];
    
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    return indexBuffer;
  }

  private drawScene(gl: WebGLRenderingContext, programInfo: any, buffers: any, cubeRotation: number) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
  
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    const fieldOfView = (45 * Math.PI) / 180;
    const aspect = gl.canvas.width / gl.canvas.height;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
  
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
  
    const modelViewMatrix = mat4.create();
  
    mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);

    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.7, [0, 1, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.3, [1, 0, 0]);

    this.setPositionAttribute(gl, buffers, programInfo);
    this.setColorAttribute(gl, buffers, programInfo);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
 
    gl.useProgram(programInfo.program);
  
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix as Float32Array);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix as Float32Array);
  
    {
      const vertexCount = 36;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
  }
  
  private setPositionAttribute(gl: WebGLRenderingContext, buffers: any, programInfo: any) {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  private setColorAttribute(gl: WebGLRenderingContext, buffers: any, programInfo: any) {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
  }

}
