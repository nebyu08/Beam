import { Camera, Mesh, Program, Renderer, Sphere, Texture, Transform } from 'ogl';

const EARTH_VERT = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const EARTH_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tDay;
uniform sampler2D tWater;
uniform vec3 uLight;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 light = normalize(uLight);
  float diffuse = max(dot(normal, light), 0.0);
  vec3 day = texture2D(tDay, vUv).rgb;
  day = pow(max(day, vec3(0.0)), vec3(0.72));
  float wet = texture2D(tWater, vUv).r;
  vec3 view = vec3(0.0, 0.0, 1.0);
  float spec = pow(max(dot(reflect(-light, normal), view), 0.0), 28.0) * wet;
  vec3 color = day * (0.92 + diffuse * 0.28) + vec3(0.85, 0.93, 1.0) * spec * 0.28;
  gl_FragColor = vec4(color, 1.0);
}
`;

const CLOUD_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tClouds;
uniform vec3 uLight;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec4 cloud = texture2D(tClouds, vUv);
  float shade = 0.82 + 0.28 * max(dot(normalize(vNormal), normalize(uLight)), 0.0);
  gl_FragColor = vec4(vec3(1.0) * shade, cloud.a * 0.72);
}
`;

const AIR_FRAG = /* glsl */ `
precision highp float;

varying vec3 vNormal;

void main() {
  float rim = pow(0.68 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.4);
  gl_FragColor = vec4(0.45, 0.74, 1.0, rim);
}
`;

function loadTexture(gl: WebGLRenderingContext, src: string, wrapS: number) {
  const texture = new Texture(gl, {
    wrapS,
    wrapT: gl.CLAMP_TO_EDGE,
    generateMipmaps: true,
  });
  const image = new Image();
  image.onload = () => {
    texture.image = image;
    texture.needsUpdate = true;
  };
  image.src = src;
  return texture;
}

export type LivingEarth = {
  render: (width: number, height: number, radius: number, lambda: number, phi: number) => void;
  destroy: () => void;
};

export function createLivingEarth(canvas: HTMLCanvasElement): LivingEarth | null {
  let renderer: Renderer;
  try {
    renderer = new Renderer({ canvas, alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
  } catch {
    return null;
  }

  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const camera = new Camera(gl, {
    near: 0.1,
    far: 4000,
    left: -1,
    right: 1,
    bottom: -1,
    top: 1,
  });
  camera.position.z = 1200;

  const scene = new Transform();
  const earthPivot = new Transform();
  earthPivot.setParent(scene);

  const day = loadTexture(gl, '/globe/earth-day.jpg', gl.REPEAT);
  const water = loadTexture(gl, '/globe/earth-water.png', gl.REPEAT);
  const clouds = loadTexture(gl, '/globe/earth-clouds.png', gl.REPEAT);

  const sphere = new Sphere(gl, { radius: 1, widthSegments: 96, heightSegments: 64 });
  const earth = new Mesh(gl, {
    geometry: sphere,
    program: new Program(gl, {
      vertex: EARTH_VERT,
      fragment: EARTH_FRAG,
      uniforms: {
        tDay: { value: day },
        tWater: { value: water },
        uLight: { value: [-0.2, 0.35, 0.95] },
      },
    }),
  });
  earth.setParent(earthPivot);

  const cloudSphere = new Sphere(gl, { radius: 1.012, widthSegments: 80, heightSegments: 48 });
  const cloudMesh = new Mesh(gl, {
    geometry: cloudSphere,
    program: new Program(gl, {
      vertex: EARTH_VERT,
      fragment: CLOUD_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        tClouds: { value: clouds },
        uLight: { value: [-0.2, 0.35, 0.95] },
      },
    }),
  });
  cloudMesh.setParent(earthPivot);

  const air = new Mesh(gl, {
    geometry: new Sphere(gl, { radius: 1.08, widthSegments: 64, heightSegments: 40 }),
    program: new Program(gl, {
      vertex: EARTH_VERT,
      fragment: AIR_FRAG,
      transparent: true,
      depthWrite: false,
      cullFace: gl.FRONT,
    }),
  });
  air.setParent(earthPivot);

  let cloudSpin = 0;

  return {
    render(width, height, radius, lambda, phi) {
      if (width < 2 || height < 2 || radius < 2) return;
      renderer.setSize(width, height);
      camera.orthographic({
        left: -width / 2,
        right: width / 2,
        bottom: -height / 2,
        top: height / 2,
        near: 0.1,
        far: 4000,
      });
      earthPivot.scale.set(radius, radius, radius);

      // The texture's prime meridian sits on +X. d3 shows longitude -λ and
      // latitude -φ, and yaw has to increase with λ or the picture slides
      // against the country under the pointer.
      earthPivot.rotation.y = (lambda * Math.PI) / 180 - Math.PI / 2;
      earthPivot.rotation.x = (-phi * Math.PI) / 180;
      cloudSpin += 0.00035;
      cloudMesh.rotation.y = cloudSpin;

      renderer.render({ scene, camera });
    },
    destroy() {
      // The canvas is owned by React. Dropping the renderer is enough for this page.
    },
  };
}
