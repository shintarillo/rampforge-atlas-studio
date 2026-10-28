import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const MESH_LABELS = {
  cube: "Cubo biselado",
  sphere: "Esfera",
  cylinder: "Cilindro",
  plane: "Malla plana",
};

export class ThreePreview {
  constructor({ container, canvas, textureCanvas, hasTexture = true, pbrCanvas = null }) {
    this.container = container;
    this.canvas = canvas;
    this.textureCanvas = textureCanvas;
    this.hasTexture = hasTexture;
    this.pbrCanvas = pbrCanvas;
    this.pbrEmissionScale = 4;
    this.pbrEnabled = false;
    this.pbrHasAlpha = false;
    this.currentMesh = "cube";
    this.currentShading = "pbr";
    this.autoRotate = false;
    this.disposed = false;
    this.clock = new THREE.Clock();
    this.entrance = 0;
    this.uvRegion = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    this.camera.position.set(3.1, 2.25, 3.85);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 8.5;
    this.controls.minPolarAngle = 0.32;
    this.controls.maxPolarAngle = 1.52;
    this.controls.autoRotateSpeed = 1.2;
    this.controls.update();

    this._buildEnvironment();
    this._buildLights();
    this._buildMaterials();
    this._buildObjects();
    this._buildFloor();

    this.currentMesh = null;
    this.setMesh("cube", { animate: false });
    this._applyShading();

    this._resize = this._resize.bind(this);
    this._animate = this._animate.bind(this);
    this.resizeObserver = new ResizeObserver(this._resize);
    this.resizeObserver.observe(this.container);
    this._resize();

    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.disposed = true;
    });

    this._raf = requestAnimationFrame(this._animate);
  }

  _buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(environment, 0.035);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.58;
    environment.dispose();
    pmrem.dispose();
  }

  _buildLights() {
    this.hemisphere = new THREE.HemisphereLight(0xd4e8ff, 0x15130f, 1.4);
    this.scene.add(this.hemisphere);

    this.keyLight = new THREE.DirectionalLight(0xffead2, 3.15);
    this.keyLight.position.set(-3.2, 4.8, 2.8);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 0.1;
    this.keyLight.shadow.camera.far = 18;
    this.keyLight.shadow.camera.left = -4;
    this.keyLight.shadow.camera.right = 4;
    this.keyLight.shadow.camera.top = 4;
    this.keyLight.shadow.camera.bottom = -4;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.025;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.fillLight = new THREE.DirectionalLight(0x8cc7e6, 0.72);
    this.fillLight.position.set(4, 1.2, -3.8);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffb98e, 0.75);
    this.rimLight.position.set(1.8, 1.6, -4.2);
    this.scene.add(this.rimLight);
  }

  _buildMaterials() {
    this.texture = new THREE.CanvasTexture(this.textureCanvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.texture.needsUpdate = true;

    this.pbrTexture = new THREE.CanvasTexture(this.pbrCanvas || this._fallbackPbrCanvas());
    this.pbrTexture.colorSpace = THREE.NoColorSpace;
    this.pbrTexture.minFilter = THREE.NearestFilter;
    this.pbrTexture.magFilter = THREE.NearestFilter;
    this.pbrTexture.generateMipmaps = false;
    this.pbrTexture.needsUpdate = true;

    this.pbrUniforms = {
      uPbrMap: { value: this.pbrTexture },
      uPbrEmissionScale: { value: this.pbrEmissionScale },
      uPbrEnabled: { value: 0 },
    };

    this.materials = {
      pbr: new THREE.MeshStandardMaterial({
        name: "RampForge PBR",
        map: this.hasTexture ? this.texture : null,
        color: this.hasTexture ? 0xffffff : 0x2b2e35,
        roughness: 0.42,
        metalness: 0.12,
        envMapIntensity: 0.9,
        side: THREE.DoubleSide,
      }),
      toon: new THREE.MeshToonMaterial({
        name: "RampForge Toon",
        map: this.hasTexture ? this.texture : null,
        color: this.hasTexture ? 0xffffff : 0x2b2e35,
        gradientMap: this._createToonGradient(),
        side: THREE.DoubleSide,
      }),
    };

    this._installPbrShaders(this.materials.pbr, true);
    this._installPbrShaders(this.materials.toon, false);
  }

  _fallbackPbrCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    context.fillStyle = "#b70000";
    context.fillRect(0, 0, 1, 1);
    return canvas;
  }

  _installPbrShaders(material, supportsSurfaceChannels) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uPbrMap = this.pbrUniforms.uPbrMap;
      shader.uniforms.uPbrEmissionScale = this.pbrUniforms.uPbrEmissionScale;
      shader.uniforms.uPbrEnabled = this.pbrUniforms.uPbrEnabled;

      let fragment = `uniform sampler2D uPbrMap;
uniform float uPbrEmissionScale;
uniform float uPbrEnabled;
${shader.fragmentShader}`;

      fragment = fragment
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
vec4 pbrMaskData = vec4(0.72, 0.0, 0.0, 1.0);
#ifdef USE_MAP
  if (uPbrEnabled > 0.5) pbrMaskData = texture2D(uPbrMap, vMapUv);
#endif`,
        )
        .replace(
          "#include <alphamap_fragment>",
          `#include <alphamap_fragment>
diffuseColor.a *= mix(1.0, pbrMaskData.a, uPbrEnabled);`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * pbrMaskData.b * uPbrEmissionScale * uPbrEnabled;`,
        );

      if (supportsSurfaceChannels) {
        fragment = fragment
          .replace(
            "#include <roughnessmap_fragment>",
            "float roughnessFactor = mix( roughness, clamp( pbrMaskData.r, 0.04, 1.0 ), uPbrEnabled );",
          )
          .replace(
            "#include <metalnessmap_fragment>",
            "float metalnessFactor = mix( metalness, clamp( pbrMaskData.g, 0.0, 1.0 ), uPbrEnabled );",
          );
      }

      shader.fragmentShader = fragment;
    };
    material.customProgramCacheKey = () => `rampforge-pbr-${supportsSurfaceChannels ? "surface" : "toon"}`;
  }

  setPbrMask(canvas, { enabled = true, emissionScale = 4, hasAlpha = false } = {}) {
    if (!this.pbrTexture) return;
    if (canvas) {
      this.pbrCanvas = canvas;
      this.pbrTexture.image = canvas;
      this.pbrTexture.needsUpdate = true;
    }
    this.pbrEnabled = Boolean(enabled);
    this.pbrEmissionScale = Number(emissionScale) || 4;
    this.pbrHasAlpha = Boolean(hasAlpha);
    this.pbrUniforms.uPbrEnabled.value = this.pbrEnabled ? 1 : 0;
    this.pbrUniforms.uPbrEmissionScale.value = this.pbrEmissionScale;

    [this.materials.pbr, this.materials.toon].forEach((material) => {
      if (material.transparent !== this.pbrHasAlpha) {
        material.transparent = this.pbrHasAlpha;
        material.depthWrite = !this.pbrHasAlpha;
        material.needsUpdate = true;
      }
    });
  }

  _createToonGradient() {
    const values = new Uint8Array([38, 92, 156, 217, 255]);
    const texture = new THREE.DataTexture(values, values.length, 1, THREE.RedFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
  }

  _planeGeometry() {
    const geometry = new RoundedBoxGeometry(2.02, 2.02, 0.11, 4, 0.055);
    return geometry;
  }

  _buildObjects() {
    this.objectGroup = new THREE.Group();
    this.scene.add(this.objectGroup);

    this.objects = {
      cube: new THREE.Mesh(
        new RoundedBoxGeometry(1.64, 1.64, 1.64, 6, 0.17),
        this.materials.pbr,
      ),
      sphere: new THREE.Mesh(
        new THREE.SphereGeometry(1.04, 80, 56),
        this.materials.pbr,
      ),
      cylinder: new THREE.Mesh(
        new THREE.CylinderGeometry(0.82, 0.82, 1.76, 80, 1, false),
        this.materials.pbr,
      ),
      plane: new THREE.Mesh(
        this._planeGeometry(),
        this.materials.pbr,
      ),
    };

    this.originalUvs = {};
    Object.entries(this.objects).forEach(([type, mesh]) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = false;
      if (type === "plane") {
        mesh.rotation.x = -0.08;
        mesh.rotation.y = -0.28;
      }
      const uv = mesh.geometry.getAttribute("uv");
      this.originalUvs[type] = uv ? new Float32Array(uv.array) : null;
      this.objectGroup.add(mesh);
    });
  }

  _buildFloor() {
    const floorGeometry = new THREE.PlaneGeometry(9, 9);
    const floorMaterial = new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: 0.32,
      transparent: true,
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -1.28;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
  }

  _applyShading() {
    if (!this.objects) return;
    const material = this.materials[this.currentShading] || this.materials.pbr;
    Object.values(this.objects).forEach((mesh) => {
      mesh.material = material;
    });
  }

  _applyTextureState() {
    const map = this.hasTexture ? this.texture : null;
    const color = this.hasTexture ? 0xffffff : 0x2b2e35;
    [this.materials.pbr, this.materials.toon].forEach((material) => {
      if (material.map !== map) {
        material.map = map;
        material.needsUpdate = true;
      }
      material.color.setHex(color);
    });
    this.texture.needsUpdate = true;
  }

  setTexture(hasTexture = true) {
    this.hasTexture = Boolean(hasTexture);
    this._applyTextureState();
  }

  refreshTexture(hasTexture = this.hasTexture) {
    this.hasTexture = Boolean(hasTexture);
    this._applyTextureState();
  }

  /**
   * Remaps the original UV coordinates of every test mesh so they sample only
   * the requested normalized rectangle of the atlas. The texture itself is
   * never cropped, which keeps material filtering and mipmaps intact.
   *
   * Region coordinates use the top-left origin of the canvas:
   * { x, y, width, height } in 0..1.
   */
  setUvRegion(region) {
    if (!region) return;
    const next = {
      x: THREE.MathUtils.clamp(Number(region.x) || 0, 0, 1),
      y: THREE.MathUtils.clamp(Number(region.y) || 0, 0, 1),
      width: THREE.MathUtils.clamp(Number(region.width) || 0, 0.001, 1),
      height: THREE.MathUtils.clamp(Number(region.height) || 0, 0.001, 1),
    };
    next.width = Math.min(next.width, 1 - next.x);
    next.height = Math.min(next.height, 1 - next.y);

    if (
      this.uvRegion &&
      Math.abs(this.uvRegion.x - next.x) < 1e-7 &&
      Math.abs(this.uvRegion.y - next.y) < 1e-7 &&
      Math.abs(this.uvRegion.width - next.width) < 1e-7 &&
      Math.abs(this.uvRegion.height - next.height) < 1e-7
    ) {
      return;
    }
    this.uvRegion = next;

    // Canvas textures are uploaded with flipY=true, so v=1 corresponds to the
    // top edge of the canvas. Convert the top-left region into that UV space.
    const vOffset = 1 - next.y - next.height;

    Object.entries(this.objects).forEach(([type, mesh]) => {
      const attribute = mesh.geometry.getAttribute("uv");
      const original = this.originalUvs?.[type];
      if (!attribute || !original) return;
      const target = attribute.array;
      for (let index = 0; index < original.length; index += 2) {
        target[index] = next.x + original[index] * next.width;
        target[index + 1] = vOffset + original[index + 1] * next.height;
      }
      attribute.needsUpdate = true;
    });
  }

  getUvRegion() {
    return this.uvRegion ? { ...this.uvRegion } : null;
  }

  setMesh(type, { animate = true } = {}) {
    const meshType = this.objects[type] ? type : "cube";
    if (this.currentMesh === meshType) return MESH_LABELS[meshType];
    this.currentMesh = meshType;
    this.entrance = animate ? 0 : 1;
    this.objectGroup.clear();
    const mesh = this.objects[meshType];
    mesh.visible = true;
    this.objectGroup.add(mesh);
    this.objectGroup.rotation.set(0, 0, 0);
    this.objectGroup.scale.setScalar(1);
    this.objectGroup.position.set(0, 0, 0);

    if (animate) {
      this.objectGroup.scale.setScalar(0.92);
      this.objectGroup.rotation.y = -0.12;
    }
    return MESH_LABELS[meshType];
  }

  setShading(mode) {
    this.currentShading = mode === "toon" ? "toon" : "pbr";
    this._applyShading();
  }

  setAutoRotate(enabled) {
    this.autoRotate = Boolean(enabled);
    this.controls.autoRotate = this.autoRotate;
  }

  setLight({ intensity = 3.15, azimuth = -35, elevation = 48 }) {
    const azimuthRad = THREE.MathUtils.degToRad(Number(azimuth));
    const elevationRad = THREE.MathUtils.degToRad(Number(elevation));
    const radius = 6.2;
    const cosElevation = Math.cos(elevationRad);
    this.keyLight.position.set(
      radius * cosElevation * Math.sin(azimuthRad),
      radius * Math.sin(elevationRad),
      radius * cosElevation * Math.cos(azimuthRad),
    );
    this.keyLight.intensity = Number(intensity);
    this.keyLight.target.position.set(0, 0, 0);
    this.keyLight.target.updateMatrixWorld();
  }

  resetView() {
    this.camera.position.set(3.1, 2.25, 3.85);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.entrance = 0.35;
  }

  _resize() {
    if (this.disposed) return;
    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  _animate() {
    if (this.disposed) return;
    const elapsed = this.clock.getElapsedTime();

    if (this.entrance < 1) {
      this.entrance = Math.min(1, this.entrance + 0.045);
      const smooth = 1 - (1 - this.entrance) ** 3;
      const scale = 0.92 + smooth * 0.08;
      this.objectGroup.scale.setScalar(scale);
      this.objectGroup.rotation.y -= (this.objectGroup.rotation.y + 0.1) * 0.12;
    }

    if (this.objectGroup) {
      this.objectGroup.position.y = Math.sin(elapsed * 0.8) * 0.012;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._animate);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this._raf);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material.map && material.map !== this.texture) material.map.dispose();
          if (material !== this.materials?.pbr && material !== this.materials?.toon) {
            material.dispose();
          }
        });
      }
    });
    this.materials?.pbr.dispose();
    this.materials?.toon.dispose();
    this.materials?.toon.gradientMap?.dispose();
    this.texture?.dispose();
    this.pbrTexture?.dispose();
    this.environmentTarget?.dispose();
    this.renderer?.dispose();
  }
}
