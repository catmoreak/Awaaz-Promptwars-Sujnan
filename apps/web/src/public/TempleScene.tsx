import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/**
 * A stylised night model of Saavira Kambada Basadi, the Thousand Pillar Temple in Moodbidri.
 * Proportions and features follow aerial and ground photographs of the temple, but this is
 * an artist's recreation built from code, not a survey.
 */

const NIGHT = '#0F1318';
const FRAME_SECONDS = 1 / 30;

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Long granite courses with staggered joints, the temple's most distinctive roof. */
const slabTexture = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#C9B99C';
    ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 6; row++) {
      const y = row * 85.3;
      ctx.fillStyle = row % 2 ? '#BCAB8D' : '#D3C4A8';
      ctx.fillRect(0, y, 512, 85);
      ctx.fillStyle = '#6E6250';
      ctx.fillRect(0, y + 80, 512, 6);
      ctx.fillStyle = '#7A6E5B';
      for (let x = (row % 2) * 60; x < 512; x += 120) ctx.fillRect(x, y, 3, 80);
    }
  });

const tileTexture = (base: string, line: string) =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = line;
    for (let y = 0; y < 256; y += 16) ctx.fillRect(0, y, 256, 2);
    for (let row = 0; row < 16; row++) {
      for (let x = (row % 2) * 8; x < 256; x += 16) ctx.fillRect(x, row * 16, 2, 16);
    }
  });

/** Dark laterite with the wall's row of triangles along the top. */
const wallTexture = () =>
  canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#4A2E25';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#6B4334';
    ctx.fillRect(0, 0, 512, 34);
    ctx.fillStyle = '#2A1B16';
    for (let x = 0; x < 512; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 34);
      ctx.lineTo(x + 14, 62);
      ctx.lineTo(x + 28, 34);
      ctx.fill();
    }
    ctx.fillStyle = '#3A241D';
    for (let y = 72; y < 128; y += 12) ctx.fillRect(0, y, 512, 2);
  });

function quad(positions: number[], uvs: number[], a: number[], b: number[], c: number[], d: number[], uMax: number, vMax: number) {
  positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  uvs.push(0, 0, uMax, 0, uMax, vMax, 0, 0, uMax, vMax, 0, vMax);
}

/** Four sloping faces from a lower rectangle to a smaller upper one. Ridge roofs set `topDepth` near zero. */
function slopedRoof(width: number, depth: number, topWidth: number, topDepth: number, height: number, tile = 1) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const [w, d, tw, td] = [width / 2, depth / 2, topWidth / 2, topDepth / 2];
  const slant = Math.hypot(height, Math.max(w - tw, d - td));

  quad(positions, uvs, [-w, 0, d], [w, 0, d], [tw, height, td], [-tw, height, td], width / tile, slant / tile);
  quad(positions, uvs, [w, 0, -d], [-w, 0, -d], [-tw, height, -td], [tw, height, -td], width / tile, slant / tile);
  quad(positions, uvs, [w, 0, d], [w, 0, -d], [tw, height, -td], [tw, height, td], depth / tile, slant / tile);
  quad(positions, uvs, [-w, 0, -d], [-w, 0, d], [-tw, height, td], [-tw, height, -td], depth / tile, slant / tile);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, shadow = true) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  item.castShadow = shadow;
  item.receiveShadow = true;
  return item;
}

export default function TempleScene({ onReady }: { onReady?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onReady?.();
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(NIGHT);
    scene.fog = new THREE.Fog(NIGHT, 62, 118);

    const camera = new THREE.PerspectiveCamera(27, 1, 0.5, 220);
    const target = new THREE.Vector3(-1, 4.2, 0);

    scene.add(new THREE.HemisphereLight('#A9B8D0', '#0B0E12', 0.72));
    const moon = new THREE.DirectionalLight('#DCEBFF', 2.1);
    moon.position.set(26, 38, 30);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -40;
    moon.shadow.camera.right = 40;
    moon.shadow.camera.top = 40;
    moon.shadow.camera.bottom = -40;
    moon.shadow.camera.far = 120;
    moon.shadow.bias = -0.0003;
    moon.shadow.normalBias = 0.04;
    scene.add(moon);
    const warmRim = new THREE.DirectionalLight('#E9CC8C', 0.8);
    warmRim.position.set(-30, 14, -18);
    scene.add(warmRim);

    const textures: THREE.Texture[] = [];
    const track = <T extends THREE.Texture>(texture: T) => {
      textures.push(texture);
      return texture;
    };

    const stone = new THREE.MeshStandardMaterial({ color: '#A9B3AB', roughness: 0.85 });
    const darkStone = new THREE.MeshStandardMaterial({ color: '#4C5550', roughness: 0.9 });
    const white = new THREE.MeshStandardMaterial({ color: '#E8EDE6', roughness: 0.75 });
    const red = new THREE.MeshStandardMaterial({ color: '#B23C2C', roughness: 0.6 });
    const brass = new THREE.MeshStandardMaterial({ color: '#D8C27A', roughness: 0.3, metalness: 0.7 });
    const glow = new THREE.MeshStandardMaterial({ color: '#2A1F14', emissive: '#FFC47A', emissiveIntensity: 1.1 });
    const slabs = new THREE.MeshStandardMaterial({ map: track(slabTexture()), roughness: 0.82, side: THREE.DoubleSide });
    const tiles = new THREE.MeshStandardMaterial({ map: track(tileTexture('#7E4A3E', '#4C2A23')), roughness: 0.8, side: THREE.DoubleSide });
    const greyRoof = new THREE.MeshStandardMaterial({ map: track(tileTexture('#8E9A8A', '#68746A')), roughness: 0.8, side: THREE.DoubleSide });
    const eaveRoof = new THREE.MeshStandardMaterial({ map: track(tileTexture('#3F3A33', '#28241F')), roughness: 0.9, side: THREE.DoubleSide });
    const wall = new THREE.MeshStandardMaterial({ map: track(wallTexture()), roughness: 0.95 });
    const lampLine = new THREE.MeshStandardMaterial({ color: '#D9B56A', emissive: '#D9B56A', emissiveIntensity: 1.5 });

    const model = new THREE.Group();
    scene.add(model);

    // Pale slab skirt, red fascia along its edge.
    const skirt = (width: number, depth: number, topWidth: number, topDepth: number, y: number, height: number, z: number) => {
      model.add(mesh(slopedRoof(width, depth, topWidth, topDepth, height, 2.6), slabs, 0, y, z));
      model.add(mesh(new THREE.BoxGeometry(width + 0.1, 0.1, depth + 0.1), darkStone, 0, y - 0.04, z));
    };

    const band = (width: number, depth: number, y: number, height: number, z: number) => {
      model.add(mesh(new THREE.BoxGeometry(width, height, depth), white, 0, y + height / 2, z));
      model.add(mesh(new THREE.BoxGeometry(width + 0.1, 0.12, depth + 0.1), red, 0, y + height * 0.28, z));
      model.add(mesh(new THREE.BoxGeometry(width + 0.34, 0.1, depth + 0.34), red, 0, y + height, z));
    };

    const finial = (x: number, y: number, z: number, scale = 1) => {
      const profile = [[0, 0], [0.2, 0], [0.16, 0.1], [0.3, 0.28], [0.17, 0.48], [0.1, 0.56], [0.14, 0.66], [0.04, 0.95], [0, 1.08]].map(
        ([px = 0, py = 0]) => new THREE.Vector2(px * scale, py * scale),
      );
      model.add(mesh(new THREE.LatheGeometry(profile, 16), brass, x, y, z));
    };

    /** A triangular gable with the red timber frame seen on the upper roofs. */
    const gable = (width: number, height: number, x: number, y: number, z: number, rotation: number) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.rotation.y = rotation;
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, 0);
      shape.lineTo(0, height);
      shape.lineTo(width / 2, 0);
      shape.closePath();
      group.add(mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false }), red));
      const inner = new THREE.Shape();
      inner.moveTo(-width * 0.4, 0.1);
      inner.lineTo(0, height * 0.82);
      inner.lineTo(width * 0.4, 0.1);
      inner.closePath();
      const panel = mesh(new THREE.ExtrudeGeometry(inner, { depth: 0.04, bevelEnabled: false }), glow, 0, 0, 0.13, false);
      group.add(panel);
      for (const offset of [-0.22, 0, 0.22]) {
        group.add(mesh(new THREE.BoxGeometry(0.07, height * 0.75, 0.05), red, width * offset, height * 0.37, 0.18));
      }
      model.add(group);
    };

    /** The small dark hip roofs that break the eave line above the pillars. */
    const gablet = (x: number, y: number, z: number, size: number) => {
      model.add(mesh(slopedRoof(size, size * 0.86, 0.02, 0.02, size * 0.56, 0.7), eaveRoof, x, y, z));
    };

    const turret = (x: number, y: number, z: number) => {
      model.add(mesh(new THREE.BoxGeometry(1.5, 0.74, 1.5), white, x, y + 0.37, z));
      model.add(mesh(new THREE.BoxGeometry(0.52, 0.4, 0.04), glow, x, y + 0.38, z + 0.77, false));
      model.add(mesh(new THREE.BoxGeometry(1.62, 0.09, 1.62), red, x, y + 0.76, z));
      model.add(mesh(slopedRoof(2.1, 2.1, 0.02, 0.02, 1, 0.9), tiles, x, y + 0.8, z));
      finial(x, y + 1.76, z, 0.45);
    };

    // Compound
    const courtyard = mesh(new THREE.BoxGeometry(30, 0.3, 54), new THREE.MeshStandardMaterial({ color: '#23221F', roughness: 1 }), 0, -0.15, 2);
    model.add(courtyard);
    model.add(mesh(new THREE.BoxGeometry(11, 0.1, 15), new THREE.MeshStandardMaterial({ color: '#3A3F3A', roughness: 0.95 }), 3, 0.04, 19.5));

    const wallPiece = (width: number, depth: number, x: number, z: number, repeat: number) => {
      const material = wall.clone();
      const map = track((wall.map as THREE.Texture).clone());
      map.repeat.set(repeat, 1);
      map.needsUpdate = true;
      material.map = map;
      model.add(mesh(new THREE.BoxGeometry(width, 3, depth), material, x, 1.5, z));
    };
    wallPiece(30.8, 0.8, 0, -25, 7);
    wallPiece(0.8, 54, -15, 2, 12);
    wallPiece(0.8, 54, 15, 2, 12);
    wallPiece(11, 0.8, -9.5, 29, 3);

    const trace = (width: number, depth: number, x: number, y: number, z: number) => {
      model.add(mesh(new THREE.BoxGeometry(width, 0.06, depth), lampLine, x, y, z, false));
    };
    trace(30.9, 0.1, 0, 3.03, -25);
    trace(0.1, 54, -15.4, 3.03, 2);
    trace(0.1, 54, 15.4, 3.03, 2);
    trace(11, 0.1, -9.5, 3.03, 29);

    // Plinths
    model.add(mesh(new THREE.BoxGeometry(12.6, 0.5, 10.6), darkStone, 0, 0.25, 11));
    model.add(mesh(new THREE.BoxGeometry(11.4, 0.5, 23), darkStone, 0, 0.25, -2.5));
    model.add(mesh(new THREE.BoxGeometry(12, 0.5, 9.4), darkStone, 0, 0.25, -14.5));
    trace(12.7, 0.06, 0, 0.52, 16.32);
    trace(0.06, 10.7, 6.32, 0.52, 11);
    trace(0.06, 10.7, -6.32, 0.52, 11);
    trace(0.06, 23, 5.72, 0.52, -2.5);
    trace(0.06, 23, -5.72, 0.52, -2.5);
    model.add(mesh(new THREE.BoxGeometry(4.4, 0.25, 1.6), stone, 0, 0.12, 17));

    // Lit inner halls, seen between the pillars.
    model.add(mesh(new THREE.BoxGeometry(8.8, 1.7, 6.8), glow, 0, 1.35, 11, false));
    model.add(mesh(new THREE.BoxGeometry(5.8, 1.7, 21), glow, 0, 1.35, -3, false));
    model.add(mesh(new THREE.BoxGeometry(8.6, 1.7, 6.6), glow, 0, 1.35, -14.5, false));

    // Pillars: a square block, a turned shaft and a bracket, as in the temple's halls.
    const pillarSpots: [number, number][] = [];
    for (let x = -5.5; x <= 5.5; x += 1.83) {
      pillarSpots.push([x, 15.7], [x, 6.3]);
    }
    for (let z = 6.3 + 1.57; z < 15.7; z += 1.57) {
      pillarSpots.push([-5.5, z], [5.5, z]);
    }
    for (let z = 5; z >= -8.6; z -= 1.28) {
      pillarSpots.push([-5, z], [5, z]);
    }
    for (let x = -5.2; x <= 5.2; x += 1.73) pillarSpots.push([x, -18.6]);
    for (let z = -18.6 + 1.6; z <= -10.5; z += 1.6) pillarSpots.push([-5.2, z], [5.2, z]);

    const blockMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.9, 0.46), stone, pillarSpots.length);
    const shaftProfile = [[0.17, 0], [0.17, 0.38], [0.22, 0.42], [0.16, 0.5], [0.14, 0.6], [0.25, 0.78], [0.28, 0.92], [0.2, 1.02], [0.26, 1.08], [0, 1.08]].map(
      ([x = 0, y = 0]) => new THREE.Vector2(x, y),
    );
    const shaftMesh = new THREE.InstancedMesh(new THREE.LatheGeometry(shaftProfile, 8), stone, pillarSpots.length);
    const bracketMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.14, 0.62), stone, pillarSpots.length);
    const matrix = new THREE.Matrix4();
    pillarSpots.forEach(([x, z], index) => {
      blockMesh.setMatrixAt(index, matrix.makeTranslation(x, 0.95, z));
      shaftMesh.setMatrixAt(index, matrix.makeTranslation(x, 1.4, z));
      bracketMesh.setMatrixAt(index, matrix.makeTranslation(x, 2.5, z));
    });
    for (const instanced of [blockMesh, shaftMesh, bracketMesh]) {
      instanced.castShadow = true;
      instanced.receiveShadow = true;
      model.add(instanced);
    }

    // Front hall
    skirt(12.5, 10.5, 8, 6, 2.58, 1.6, 11);
    band(7.6, 5.6, 4.18, 1.15, 11);
    // The front roof is cross-shaped: two hip roofs crossing at the centre.
    model.add(mesh(slopedRoof(8.5, 6.4, 1.6, 0.02, 2.4, 1.5), tiles, 0, 5.37, 11));
    model.add(mesh(slopedRoof(4.4, 7.6, 0.02, 1.6, 2.4, 1.5), tiles, 0, 5.37, 11));
    model.add(mesh(new THREE.BoxGeometry(8.7, 0.1, 6.6), red, 0, 5.36, 11));
    finial(0, 7.76, 11, 0.7);
    gable(2.2, 1.15, 4.16, 5.42, 11, Math.PI / 2);
    gable(2.2, 1.15, -4.16, 5.42, 11, -Math.PI / 2);
    for (const x of [-4.6, -2.3, 0, 2.3, 4.6]) gablet(x, 2.5, 16.05, 1.5);
    for (const z of [8.6, 11, 13.4]) {
      gablet(6.1, 2.5, z, 1.5);
      gablet(-6.1, 2.5, z, 1.5);
    }

    // Long central hall with its pillared verandas
    skirt(11.6, 15.6, 6.4, 14.6, 2.58, 1.4, -1.8);
    band(5.8, 14, 3.98, 0.9, -1.8);
    model.add(mesh(slopedRoof(7.6, 15.6, 0.02, 14.2, 2, 1.5), greyRoof, 0, 4.94, -1.8));
    turret(-4.3, 3.2, 3);
    turret(4.3, 3.2, -6);

    // Rear sanctum, rising in stepped tiers to the finial
    skirt(12.2, 10.6, 8.2, 6.8, 2.58, 1.85, -14.5);
    model.add(mesh(slopedRoof(9, 7.6, 6.6, 5.2, 1.5, 1.3), tiles, 0, 4.5, -14.5));
    band(5.8, 4.4, 5.98, 0.9, -14.5);
    model.add(mesh(new THREE.BoxGeometry(3, 0.5, 0.04), glow, 0, 6.5, -12.28, false));
    model.add(mesh(slopedRoof(7.6, 6.2, 1.7, 0.02, 2.6, 1.3), tiles, 0, 6.94, -14.5));
    gable(2.5, 1.3, 0, 6.94, -11.7, 0);
    finial(0, 9.48, -14.5, 1);

    // Manastambha: a stepped base, a tapering fluted shaft and a capital pavilion
    const pillarX = 7.2;
    const pillarZ = 21;
    [[6.2, 0.55], [4.8, 0.55], [3.5, 0.55], [2.3, 0.5]].reduce((y, [size = 1, height = 0.5]) => {
      model.add(mesh(new THREE.BoxGeometry(size, height, size), darkStone, pillarX, y + height / 2, pillarZ));
      model.add(mesh(new THREE.BoxGeometry(size + 0.16, 0.08, size + 0.16), stone, pillarX, y + height, pillarZ));
      return y + height;
    }, 0.09);
    const shaftY = 2.24;
    const SHAFT_HEIGHT = 10.8;
    const shaft = new THREE.CylinderGeometry(0.34, 0.66, SHAFT_HEIGHT, 48, 1, false);
    const position = shaft.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index);
      const z = position.getZ(index);
      const flute = 1 + Math.cos(Math.atan2(z, x) * 12) * 0.05;
      position.setX(index, x * flute);
      position.setZ(index, z * flute);
    }
    shaft.computeVertexNormals();
    model.add(mesh(shaft, stone, pillarX, shaftY + SHAFT_HEIGHT / 2, pillarZ));
    for (const [ringY, radius] of [[0.5, 0.74], [1, 0.68], [3.3, 0.6], [6.4, 0.5], [9.6, 0.44], [10.6, 0.42]] as const) {
      model.add(mesh(new THREE.CylinderGeometry(radius, radius, 0.12, 24), stone, pillarX, shaftY + ringY, pillarZ));
    }
    const capitalY = shaftY + SHAFT_HEIGHT;
    model.add(mesh(new THREE.CylinderGeometry(0.72, 0.36, 0.42, 16), stone, pillarX, capitalY + 0.2, pillarZ));
    model.add(mesh(new THREE.BoxGeometry(1.7, 0.16, 1.7), stone, pillarX, capitalY + 0.48, pillarZ));
    for (const [dx, dz] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]] as const) {
      model.add(mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.92, 8), stone, pillarX + dx, capitalY + 1, pillarZ + dz));
      finial(pillarX + dx * 1.18, capitalY + 1.56, pillarZ + dz * 1.18, 0.34);
    }
    model.add(mesh(new THREE.BoxGeometry(0.72, 0.86, 0.72), lampLine, pillarX, capitalY + 1, pillarZ, false));
    model.add(mesh(new THREE.BoxGeometry(1.9, 0.14, 1.9), stone, pillarX, capitalY + 1.5, pillarZ));
    model.add(mesh(slopedRoof(1.7, 1.7, 0.34, 0.34, 0.86, 1), stone, pillarX, capitalY + 1.57, pillarZ));
    finial(pillarX, capitalY + 2.4, pillarZ, 1.05);
    const beacon = new THREE.PointLight('#D9B56A', 16, 10, 1.8);
    beacon.position.set(pillarX, capitalY + 1, pillarZ);
    scene.add(beacon);
    const baseGlow = new THREE.PointLight('#D9B56A', 7, 7, 1.8);
    baseGlow.position.set(pillarX, 3.2, pillarZ + 2.4);
    scene.add(baseGlow);

    // Flagpole beside the pillar
    model.add(mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), darkStone, 3.1, 0.39, 20.8));
    const poleMaterial = new THREE.MeshStandardMaterial({ color: '#59402E', roughness: 0.6 });
    model.add(mesh(new THREE.CylinderGeometry(0.09, 0.15, 8.6, 10), poleMaterial, 3.1, 4.9, 20.8));
    for (let index = 0; index < 5; index++) {
      model.add(mesh(new THREE.BoxGeometry(0.42 - index * 0.04, 0.06, 0.14), brass, 3.1, 7 + index * 0.45, 20.8));
    }

    // Coconut palms around the compound, kept clear of the view toward the temple.
    const palmSpots: [number, number, number][] = [];
    const rand = (seed: number) => {
      const value = Math.sin(seed * 91.17) * 43758.5453;
      return value - Math.floor(value);
    };
    for (let index = 0; index < 150; index++) {
      const side = index % 3;
      const a = rand(index + 1);
      const b = rand(index + 40);
      const x = side === 0 ? -18 - b * 40 : side === 1 ? -58 + a * 80 : 18 + b * 24;
      const z = side === 1 ? -28 - b * 42 : side === 2 ? -60 + a * 50 : -60 + a * 80;
      palmSpots.push([x, z, 8 + rand(index + 80) * 6]);
    }
    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.13, 0.22, 1, 6),
      new THREE.MeshStandardMaterial({ color: '#2E2B24', roughness: 0.95 }),
      palmSpots.length,
    );
    const frondGeometry = new THREE.PlaneGeometry(3.4, 0.62, 10, 1);
    frondGeometry.translate(1.7, 0, 0);
    const frondShape = frondGeometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < frondShape.count; index++) {
      const along = frondShape.getX(index) / 3.4;
      frondShape.setY(index, frondShape.getY(index) * Math.sin(Math.PI * Math.min(1, along + 0.12)) * 0.9);
      frondShape.setZ(index, -along * along * 1.9 + along * 0.7);
    }
    frondGeometry.computeVertexNormals();
    const frondCount = 14;
    const frondMesh = new THREE.InstancedMesh(
      frondGeometry,
      new THREE.MeshStandardMaterial({ color: '#2C4A3A', roughness: 0.75, side: THREE.DoubleSide }),
      palmSpots.length * frondCount,
    );
    const helper = new THREE.Object3D();
    palmSpots.forEach(([x, z, height], index) => {
      helper.position.set(x, height / 2, z);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(1, height, 1);
      helper.updateMatrix();
      trunkMesh.setMatrixAt(index, helper.matrix);
      for (let frond = 0; frond < frondCount; frond++) {
        const angle = (frond / frondCount) * Math.PI * 2 + index * 0.7;
        helper.position.set(x, height, z);
        helper.rotation.set(-Math.PI / 2, 0, angle, 'YXZ');
        helper.rotation.set(0, angle, 0);
        helper.rotateX(-Math.PI / 2);
        helper.scale.setScalar(0.9 + rand(index + frond) * 0.3);
        helper.updateMatrix();
        frondMesh.setMatrixAt(index * frondCount + frond, helper.matrix);
      }
    });
    trunkMesh.castShadow = true;
    frondMesh.castShadow = true;
    scene.add(trunkMesh, frondMesh);

    const land = mesh(new THREE.CircleGeometry(170, 48), new THREE.MeshStandardMaterial({ color: '#12171D', roughness: 1 }), 0, -0.32, 0, false);
    land.rotation.x = -Math.PI / 2;
    scene.add(land);

    // Warm light spilling out of the halls.
    for (const [x, y, z, power] of [[0, 2, 13.5, 26], [7, 1.4, 1, 18], [-7, 1.4, 1, 18], [0, 2, -19.5, 22]] as const) {
      const lamp = new THREE.PointLight('#FFC988', power, 16, 1.8);
      lamp.position.set(x, y, z);
      scene.add(lamp);
    }

    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 2, type: THREE.HalfFloatType }));
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.42, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = host;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height);
      composer.setSize(width, height);
      camera.aspect = width / height;
      const wide = camera.aspect > 1.1;
      camera.fov = wide ? 27 : 38;
      // Moves the temple to the right of the headline on wide screens.
      if (wide) camera.setViewOffset(width, height, -width * 0.2, height * 0.03, width, height);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      composer.render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX / window.innerWidth - 0.5;
      pointer.y = event.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onPointerMove);

    const startedAt = performance.now();
    let frame = 0;
    let announced = false;
    let lastDraw = 0;

    const place = (elapsed: number) => {
      eased.x += (pointer.x - eased.x) * 0.04;
      eased.y += (pointer.y - eased.y) * 0.04;
      const angle = 0.72 + Math.sin(elapsed * 0.08) * 0.1 + eased.x * 0.16;
      const radius = 66;
      camera.position.set(Math.sin(angle) * radius, 25 - eased.y * 4, Math.cos(angle) * radius);
      camera.lookAt(target);
    };

    const render = () => {
      frame = requestAnimationFrame(render);
      const elapsed = (performance.now() - startedAt) / 1000;
      if (elapsed - lastDraw < FRAME_SECONDS) return;
      lastDraw = elapsed;
      place(elapsed);
      composer.render();
      // Nothing in the scene moves, so one shadow pass is enough and the camera does the rest.
      renderer.shadowMap.autoUpdate = false;
      if (!announced) {
        announced = true;
        onReady?.();
      }
    };

    if (reducedMotion) {
      place(0);
      composer.render();
      onReady?.();
    } else {
      render();
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      textures.forEach((texture) => texture.dispose());
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((item) => item.dispose());
        }
      });
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onReady]);

  return <div ref={hostRef} className="temple-scene" aria-hidden="true" />;
}
