(async () => {
  const canvas = document.querySelector(".molecule-canvas");
  const layer = document.querySelector(".molecule-layer");
  const tooltip = document.querySelector(".model-tooltip");
  const encoded = window.__MODEL_6TPK_BASE64;
  if (!canvas || !layer || !tooltip) return;

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  });

  if (!gl) {
    layer.hidden = true;
    return;
  }

  const vertexSource = `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 aPosition;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec4 aColor;
    uniform mat4 uModel;
    uniform mat4 uMVP;
    out vec3 vNormal;
    out vec4 vColor;
    void main() {
      gl_Position = uMVP * vec4(aPosition, 1.0);
      vNormal = normalize(mat3(uModel) * aNormal);
      vColor = aColor;
    }
  `;

  const fragmentSource = `#version 300 es
    precision highp float;
    in vec3 vNormal;
    in vec4 vColor;
    uniform float uHover;
    out vec4 outColor;
    void main() {
      vec3 normal = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
      vec3 light = normalize(vec3(-0.38, 0.72, 0.58));
      float diffuse = max(dot(normal, light), 0.0);
      float rim = pow(1.0 - abs(normal.z), 2.0) * 0.18;
      float luminance = dot(vColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 base = vec3(0.38 + luminance * 0.54) * mix(1.0, 0.78, uHover);
      vec3 lit = base * (0.34 + diffuse * 0.66) + base * rim;
      outColor = vec4(lit, 1.0);
    }
  `;

  function makeShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Shader compilation failed");
    }
    return shader;
  }

  function makeProgram() {
    const program = gl.createProgram();
    gl.attachShader(program, makeShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, makeShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
    }
    return program;
  }

  function decodeBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    const block = 32768;
    for (let offset = 0; offset < binary.length; offset += block) {
      const end = Math.min(binary.length, offset + block);
      for (let index = offset; index < end; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
    }
    return bytes.buffer;
  }

  async function loadModelBuffer() {
    if (encoded) return decodeBase64(encoded);
    const response = await fetch("6TPK.glb", { cache: "force-cache" });
    if (!response.ok) throw new Error(`Unable to load 6TPK model: ${response.status}`);
    return response.arrayBuffer();
  }

  function parseGLB(buffer) {
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
      throw new Error("Invalid GLB file");
    }
    let json = null;
    let binary = null;
    let offset = 12;
    while (offset < view.byteLength) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (type === 0x4e4f534a) {
        const text = new TextDecoder().decode(new Uint8Array(buffer, start, length));
        json = JSON.parse(text.replace(/\u0000+$/g, "").trimEnd());
      } else if (type === 0x004e4942) {
        binary = buffer.slice(start, start + length);
      }
      offset = start + length;
    }
    if (!json || !binary) throw new Error("Incomplete GLB file");
    return { json, binary };
  }

  function identity() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  function multiply(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        let sum = 0;
        for (let k = 0; k < 4; k += 1) {
          sum += a[k * 4 + row] * b[column * 4 + k];
        }
        result[column * 4 + row] = sum;
      }
    }
    return result;
  }

  function translation(x, y, z) {
    const result = identity();
    result[12] = x;
    result[13] = y;
    result[14] = z;
    return result;
  }

  function rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ]);
  }

  function rotationY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ]);
  }

  function perspective(fieldOfView, aspect, near, far) {
    const f = 1 / Math.tan(fieldOfView / 2);
    const range = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * range, -1,
      0, 0, 2 * far * near * range, 0
    ]);
  }

  function transformPoint(matrix, point) {
    const [x, y, z] = point;
    return [
      matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
    ];
  }

  function componentCount(type) {
    return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type] || 1;
  }

  function nodeMatrix(node) {
    if (node.matrix) return new Float32Array(node.matrix);
    return translation(...(node.translation || [0, 0, 0]));
  }

  function setupModel(parsed, program) {
    const { json, binary } = parsed;
    const drawables = [];
    const minimum = [Infinity, Infinity, Infinity];
    const maximum = [-Infinity, -Infinity, -Infinity];

    function uploadAttribute(accessorIndex, location) {
      const accessor = json.accessors[accessorIndex];
      const bufferView = json.bufferViews[accessor.bufferView];
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Uint8Array(binary, bufferView.byteOffset || 0, bufferView.byteLength),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        componentCount(accessor.type),
        accessor.componentType,
        Boolean(accessor.normalized),
        bufferView.byteStride || 0,
        accessor.byteOffset || 0
      );
    }

    json.nodes.forEach((node) => {
      if (node.mesh === undefined) return;
      const transform = nodeMatrix(node);
      const mesh = json.meshes[node.mesh];
      mesh.primitives.forEach((primitive) => {
        const positionAccessor = json.accessors[primitive.attributes.POSITION];
        if (positionAccessor.min && positionAccessor.max) {
          for (const x of [positionAccessor.min[0], positionAccessor.max[0]]) {
            for (const y of [positionAccessor.min[1], positionAccessor.max[1]]) {
              for (const z of [positionAccessor.min[2], positionAccessor.max[2]]) {
                const point = transformPoint(transform, [x, y, z]);
                for (let axis = 0; axis < 3; axis += 1) {
                  minimum[axis] = Math.min(minimum[axis], point[axis]);
                  maximum[axis] = Math.max(maximum[axis], point[axis]);
                }
              }
            }
          }
        }

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        uploadAttribute(primitive.attributes.POSITION, 0);
        uploadAttribute(primitive.attributes.NORMAL, 1);
        if (primitive.attributes.COLOR_0 !== undefined) {
          uploadAttribute(primitive.attributes.COLOR_0, 2);
        } else {
          gl.disableVertexAttribArray(2);
          gl.vertexAttrib4f(2, 1, 1, 1, 1);
        }

        const indexAccessor = json.accessors[primitive.indices];
        const indexView = json.bufferViews[indexAccessor.bufferView];
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(
          gl.ELEMENT_ARRAY_BUFFER,
          new Uint8Array(binary, indexView.byteOffset || 0, indexView.byteLength),
          gl.STATIC_DRAW
        );

        drawables.push({
          vao,
          count: indexAccessor.count,
          indexType: indexAccessor.componentType,
          indexOffset: indexAccessor.byteOffset || 0,
          mode: primitive.mode === undefined ? gl.TRIANGLES : primitive.mode,
          nodeMatrix: transform
        });
      });
    });

    gl.bindVertexArray(null);
    const center = minimum.map((value, axis) => (value + maximum[axis]) / 2);
    const halfSize = maximum.map((value, axis) => (value - minimum[axis]) / 2);
    const radius = Math.max(1, Math.hypot(...halfSize));
    return { drawables, center, radius, program };
  }

  function positionTooltip(event) {
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
    const leftward = event.clientX > window.innerWidth - 350;
    const upward = event.clientY > window.innerHeight - 90;
    const x = leftward ? "calc(-100% - 14px)" : "14px";
    const y = upward ? "calc(-100% - 14px)" : "14px";
    tooltip.style.transform = `translate(${x}, ${y})`;
  }

  try {
    const program = makeProgram();
    const model = setupModel(parseGLB(await loadModelBuffer()), program);
    const modelUniform = gl.getUniformLocation(program, "uModel");
    const mvpUniform = gl.getUniformLocation(program, "uMVP");
    const hoverUniform = gl.getUniformLocation(program, "uHover");
    const pixel = new Uint8Array(4);
    let hovered = false;
    let renderFrame = 0;
    let hitTestFrame = 0;
    let latestPointer = null;

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function render(time) {
      renderFrame = 0;
      if (document.hidden) return;
      resize();
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);

      const rotation = multiply(
        translation(0, Math.sin(time * 0.00055) * model.radius * 0.035, 0),
        multiply(rotationY(time * 0.00009), rotationX(0.12 + Math.sin(time * 0.00018) * 0.045))
      );
      const centered = multiply(rotation, translation(-model.center[0], -model.center[1], -model.center[2]));
      const cameraDistance = model.radius * 2.85;
      const view = translation(0, 0, -cameraDistance);
      const projection = perspective(
        38 * Math.PI / 180,
        canvas.width / canvas.height,
        Math.max(0.1, model.radius * 0.02),
        cameraDistance + model.radius * 5
      );
      const viewProjection = multiply(projection, view);
      gl.uniform1f(hoverUniform, hovered ? 1 : 0);

      model.drawables.forEach((drawable) => {
        const matrix = multiply(centered, drawable.nodeMatrix);
        const mvp = multiply(viewProjection, matrix);
        gl.uniformMatrix4fv(modelUniform, false, matrix);
        gl.uniformMatrix4fv(mvpUniform, false, mvp);
        gl.bindVertexArray(drawable.vao);
        gl.drawElements(drawable.mode, drawable.count, drawable.indexType, drawable.indexOffset);
      });

      gl.bindVertexArray(null);
      renderFrame = requestAnimationFrame(render);
    }

    function startRendering() {
      if (!renderFrame && !document.hidden) renderFrame = requestAnimationFrame(render);
    }

    function setHovered(value, event) {
      if (hovered !== value) {
        hovered = value;
        layer.classList.toggle("hovered", hovered);
        tooltip.classList.toggle("visible", hovered);
      }
      if (hovered && event) positionTooltip(event);
    }

    function hitTest() {
      hitTestFrame = 0;
      const event = latestPointer;
      if (!event) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(canvas.width - 1,
        Math.floor((event.clientX - rect.left) * canvas.width / rect.width)));
      const y = Math.max(0, Math.min(canvas.height - 1,
        canvas.height - 1 - Math.floor((event.clientY - rect.top) * canvas.height / rect.height)));
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      setHovered(pixel[3] > 8, event);
    }

    canvas.addEventListener("pointermove", (event) => {
      latestPointer = { clientX: event.clientX, clientY: event.clientY };
      if (!hitTestFrame) hitTestFrame = requestAnimationFrame(hitTest);
    });
    canvas.addEventListener("pointerleave", () => {
      latestPointer = null;
      setHovered(false);
    });
    window.addEventListener("blur", () => setHovered(false));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (renderFrame) cancelAnimationFrame(renderFrame);
        renderFrame = 0;
      } else {
        startRendering();
      }
    }, { passive: true });
    startRendering();
  } catch (error) {
    console.error("Unable to render 6TPK model", error);
    layer.hidden = true;
  }
})();
