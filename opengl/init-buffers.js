function initBuffers(gl) {
  const positionBuffer = initPositionBuffer(gl);
  const colorBuffer = initColorBuffer(gl);
  const indexBuffer = initIndexBuffer(gl);
  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer,
  };
}

function initPositionBuffer(gl) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
  const positions = [
    -1.0, -1.0, -1.0,  // 0
     1.0, -1.0, -1.0,  // 1
     1.0,  1.0, -1.0,  // 2
    -1.0,  1.0, -1.0,  // 3
    -1.0, -1.0,  1.0,  // 4
     1.0, -1.0,  1.0,  // 5
     1.0,  1.0,  1.0,  // 6
    -1.0,  1.0,  1.0,  // 7
  ];
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  return positionBuffer;
}

function initColorBuffer(gl) {
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

function initIndexBuffer(gl) {
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
  
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  return indexBuffer;
}

export { initBuffers };