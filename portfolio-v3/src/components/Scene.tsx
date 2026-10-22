import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Billboard, CameraControls, Line } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import space from '../data/space.json';
import { CATEGORIES, ITEM_BY_ID, usedIn, type Item } from '../data/content';
import { useStore } from '../lib/store';

type Vec3 = [number, number, number];

export const POINTS = space.items.map((p) => ({
    id: p.id,
    pos: p.pos as Vec3,
    neighbours: p.neighbours as [string, number][],
    item: ITEM_BY_ID[p.id]
}));
const INDEX = new Map(POINTS.map((p, i) => [p.id, i]));
const N = POINTS.length;
const ACCENT = '#c6f24e';

// Radius holding 90% of the points, so one outlier doesn't shrink the framing
const CLOUD_RADIUS = (() => {
    const d = POINTS.map((p) => Math.hypot(...p.pos)).sort((a, b) => a - b);
    return d[Math.floor(d.length * 0.9)];
})();
export const FLOOR_Y = Math.min(...POINTS.map((p) => p.pos[1])) - 1.5;

export const pointOf = (id: string) => POINTS[INDEX.get(id) as number];

// Skills of an item (or where a skill is used) plus its nearest neighbours
export function relatedIds(id: string): string[] {
    const item = ITEM_BY_ID[id];
    const related = new Set<string>();
    if (item.kind === 'skill') usedIn(id).forEach((u) => related.add(u.id));
    else (item.skills || []).forEach((s) => related.add(s));
    pointOf(id).neighbours.slice(0, 4).forEach(([n]) => related.add(n));
    related.delete(id);
    return [...related];
}

const SIZE: Record<Item['kind'], number> = {
    role: 2.4,
    project: 2.2,
    publication: 1.8,
    education: 1.7,
    certification: 1.25,
    skill: 1.1
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Zoom buttons live outside the canvas; the camera rig registers itself here
export const cameraApi: { zoom: (amount: number) => void } = { zoom: () => {} };

/* ---------------- Points ---------------- */
const vertexShader = /* glsl */ `
    attribute float aSize;
    attribute vec3 aColor;
    attribute float aState;
    attribute float aDelay;
    uniform float uTime;
    uniform float uIntro;
    uniform float uScale;
    uniform float uDrift;
    varying vec3 vColor;
    varying float vState;

    void main() {
        // Intro: points spread out from the origin into their embedding positions
        float t = clamp((uIntro - aDelay) / 0.9, 0.0, 1.0);
        float e = 1.0 - pow(1.0 - t, 3.0);
        vec3 p = position * e;
        p += uDrift * 0.06 * vec3(
            sin(uTime * 0.7 + position.y * 1.3),
            cos(uTime * 0.6 + position.z * 1.1),
            sin(uTime * 0.5 + position.x * 0.9)
        );
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        // State 0 = dimmed, 1 = normal, 2 = related, 3 = selected
        float k = aState < 1.0 ? mix(0.75, 1.0, aState)
                : aState < 2.0 ? mix(1.0, 1.3, aState - 1.0)
                : mix(1.3, 2.1, aState - 2.0);
        gl_PointSize = min(aSize * k * uScale / -mv.z, 90.0) * e;
        vColor = aColor;
        vState = aState;
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec3 uAccent;
    varying vec3 vColor;
    varying float vState;

    void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        // Solid core with a soft halo; the selected point gets an accent ring
        // (note: 'active' is reserved in GLSL ES, hence 'emphasis')
        float emphasis = smoothstep(2.4, 2.9, vState);
        float coreR = mix(0.16, 0.13, emphasis);
        float core = 1.0 - smoothstep(coreR - 0.02, coreR + 0.02, d);
        float halo = pow(1.0 - smoothstep(0.0, 0.5, d), 2.4) * 0.55;
        float ring = emphasis * (smoothstep(0.30, 0.33, d) - smoothstep(0.38, 0.41, d));
        float dim = mix(0.18, 1.0, clamp(vState, 0.0, 1.0));
        vec3 colour = mix(vColor, vec3(1.0), core * 0.35);
        colour = mix(colour, uAccent, ring);
        float alpha = max((core + halo) * dim, ring);
        gl_FragColor = vec4(colour * alpha, alpha);
    }
`;

function Cloud() {
    const selected = useStore((s) => s.selected);
    const hovered = useStore((s) => s.hovered);
    const focus = useStore((s) => s.focus);
    const query = useStore((s) => s.query);
    const select = useStore((s) => s.select);
    const hover = useStore((s) => s.hover);
    const dpr = useThree((s) => s.viewport.dpr);
    const geometry = useRef<THREE.BufferGeometry>(null);
    const intro = useRef(prefersReducedMotion() ? 3 : 0);

    const attrs = useMemo(() => {
        const position = new Float32Array(N * 3);
        const colour = new Float32Array(N * 3);
        const size = new Float32Array(N);
        const delay = new Float32Array(N);
        POINTS.forEach((p, i) => {
            position.set(p.pos, i * 3);
            // Raw sRGB: the shader writes colours straight to the screen
            const hex = CATEGORIES[p.item.category].color;
            colour.set([1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255), i * 3);
            size[i] = SIZE[p.item.kind];
            delay[i] = (Math.hypot(...p.pos) / CLOUD_RADIUS) * 0.5 + ((i * 37) % 11) / 60;
        });
        return { position, colour, size, delay };
    }, []);

    const current = useMemo(() => new Float32Array(N).fill(1), []);
    const target = useMemo(() => new Float32Array(N).fill(1), []);

    // Built by hand so the uniforms updated each frame are the ones on the GPU
    // (passing `uniforms` as a JSX prop hands the material a copy).
    // Premultiplied blending gives soft glows on the dark background.
    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uIntro: { value: intro.current },
            uScale: { value: 300 },
            uDrift: { value: prefersReducedMotion() ? 0 : 1 },
            uAccent: { value: new THREE.Vector3(198 / 255, 242 / 255, 78 / 255) }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor
    }), []);
    const uniforms = material.uniforms;

    useEffect(() => () => material.dispose(), [material]);
    useEffect(() => { uniforms.uScale.value = 300 * dpr; }, [dpr, uniforms]);

    useEffect(() => {
        target.fill(1);
        if (focus) POINTS.forEach((p, i) => { target[i] = p.item.category === focus ? 2 : 0.15; });
        if (query && query.results.length) {
            target.fill(0.3);
            query.results.forEach((r, k) => { target[INDEX.get(r.id) as number] = k === 0 ? 3 : 2; });
        }
        if (selected) {
            target.fill(0.25);
            relatedIds(selected).forEach((id) => { target[INDEX.get(id) as number] = 2; });
            target[INDEX.get(selected) as number] = 3;
        }
        if (hovered && INDEX.has(hovered)) {
            const i = INDEX.get(hovered) as number;
            target[i] = Math.max(target[i], 2.2);
        }
    }, [selected, hovered, focus, query, target]);

    useFrame((state, delta) => {
        intro.current = Math.min(intro.current + delta, 3);
        uniforms.uIntro.value = intro.current;
        uniforms.uTime.value = state.clock.elapsedTime;
        let changed = false;
        const step = Math.min(1, delta * 8);
        for (let i = 0; i < N; i++) {
            const d = target[i] - current[i];
            if (Math.abs(d) > 0.002) {
                current[i] += d * step;
                changed = true;
            }
        }
        if (changed && geometry.current) geometry.current.attributes.aState.needsUpdate = true;
    });

    const onMove = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (e.index == null) return;
        const id = POINTS[e.index].id;
        if (useStore.getState().hovered !== id) hover(id);
        document.body.style.cursor = 'pointer';
    };
    const onOut = () => {
        hover(null);
        document.body.style.cursor = '';
    };
    const onClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.index != null) select(POINTS[e.index].id);
    };

    return (
        <points onPointerMove={onMove} onPointerOut={onOut} onClick={onClick} frustumCulled={false} renderOrder={2}>
            <bufferGeometry ref={geometry}>
                <bufferAttribute attach="attributes-position" args={[attrs.position, 3]} />
                <bufferAttribute attach="attributes-aColor" args={[attrs.colour, 3]} />
                <bufferAttribute attach="attributes-aSize" args={[attrs.size, 1]} />
                <bufferAttribute attach="attributes-aDelay" args={[attrs.delay, 1]} />
                <bufferAttribute attach="attributes-aState" args={[current, 1]} />
            </bufferGeometry>
            <primitive object={material} attach="material" />
        </points>
    );
}

/* ---------------- k-NN graph ---------------- */
function Edges() {
    const material = useRef<THREE.LineBasicMaterial>(null);
    const busy = useStore((s) => !!(s.selected || s.query || s.focus));
    const elapsed = useRef(prefersReducedMotion() ? 3 : 0);

    const geometry = useMemo(() => {
        const array = new Float32Array(space.edges.length * 6);
        space.edges.forEach(([i, j], k) => {
            array.set(POINTS[i].pos, k * 6);
            array.set(POINTS[j].pos, k * 6 + 3);
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(array, 3));
        return g;
    }, []);

    useFrame((_, delta) => {
        elapsed.current += delta;
        const m = material.current;
        if (!m) return;
        const goal = elapsed.current < 1.3 ? 0 : busy ? 0.06 : 0.2;
        if (Math.abs(goal - m.opacity) > 0.002) m.opacity += (goal - m.opacity) * Math.min(1, delta * 3);
    });

    return (
        <lineSegments geometry={geometry} renderOrder={1}>
            <lineBasicMaterial ref={material} color="#a8a59a" transparent opacity={0} depthWrite={false} />
        </lineSegments>
    );
}

/* ---------------- Plot furniture: floor grid + UMAP axes ---------------- */
export const AXIS_ORIGIN: Vec3 = [-13, FLOOR_Y, 13];
export const AXES: { id: string; text: string; end: Vec3 }[] = [
    { id: '__axis-1', text: 'UMAP 1', end: [-7, FLOOR_Y, 13] },
    { id: '__axis-2', text: 'UMAP 2', end: [-13, FLOOR_Y + 6, 13] },
    { id: '__axis-3', text: 'UMAP 3', end: [-13, FLOOR_Y, 7] }
];

function PlotFrame() {
    const grid = useMemo(() => {
        const g = new THREE.GridHelper(26, 13, '#34332e', '#1f1f1c');
        g.position.y = FLOOR_Y;
        const m = g.material as THREE.Material;
        m.transparent = true;
        m.opacity = 0.9;
        m.depthWrite = false;
        return g;
    }, []);
    return (
        <>
            <primitive object={grid} />
            {AXES.map((a) => (
                <Line key={a.id} points={[AXIS_ORIGIN, a.end]} color="#6b685f" lineWidth={1.1} />
            ))}
        </>
    );
}

/* ---------------- Highlighted links ---------------- */
function FlowLine({ a, b, color }: { a: Vec3; b: Vec3; color: string }) {
    const ref = useRef<any>(null);
    useFrame((_, delta) => {
        if (ref.current?.material) ref.current.material.dashOffset -= delta * 0.7;
    });
    return <Line ref={ref} points={[a, b]} color={color} lineWidth={1.4} dashed dashSize={0.3} gapSize={0.18} transparent opacity={0.85} />;
}

function Links() {
    const selected = useStore((s) => s.selected);
    const query = useStore((s) => s.query);
    const segments = useMemo(() => {
        if (selected) {
            const a = pointOf(selected).pos;
            return relatedIds(selected).map((id) => ({
                key: `${selected}-${id}`,
                a,
                b: pointOf(id).pos,
                color: CATEGORIES[ITEM_BY_ID[id].category].color
            }));
        }
        if (query && query.results.length) {
            return query.results.slice(0, 5).map((r) => ({ key: `q-${r.id}`, a: query.position, b: pointOf(r.id).pos, color: ACCENT }));
        }
        return [];
    }, [selected, query]);

    return <>{segments.map((s) => <FlowLine key={s.key} a={s.a} b={s.b} color={s.color} />)}</>;
}

/* ---------------- Query point ---------------- */
function QueryMarker() {
    const query = useStore((s) => s.query);
    const selected = useStore((s) => s.selected);
    const ring = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!ring.current) return;
        const t = (clock.elapsedTime % 1.8) / 1.8;
        ring.current.scale.setScalar(1 + t * 1.4);
        (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
    });

    if (!query || !query.results.length || selected) return null;
    return (
        <group position={query.position}>
            <mesh>
                <sphereGeometry args={[0.18, 24, 24]} />
                <meshBasicMaterial color={ACCENT} />
            </mesh>
            <Billboard>
                <mesh ref={ring}>
                    <ringGeometry args={[0.24, 0.29, 48]} />
                    <meshBasicMaterial color={ACCENT} transparent depthWrite={false} />
                </mesh>
            </Billboard>
        </group>
    );
}

/* ---------------- Labels ----------------
   Labels are DOM elements (see LabelLayer). They are projected to the canvas
   only when the camera or the label set changes. The UI they must avoid is
   measured once per layout change, never per frame. */
export interface LabelEntry {
    el: HTMLElement;
    pos: Vec3;
    priority: number;
    width: number;
    height: number;
}
export const labelRegistry = new Map<string, LabelEntry>();
export const labelState = { version: 0, blockersDirty: true };

type Rect = { x: number; y: number; w: number; h: number };

function LabelProjector() {
    const camera = useThree((s) => s.camera);
    const size = useThree((s) => s.size);
    const gl = useThree((s) => s.gl);
    const v = useMemo(() => new THREE.Vector3(), []);
    const lastMatrix = useMemo(() => new THREE.Matrix4(), []);
    const lastVersion = useRef(-1);
    const blockers = useRef<Rect[]>([]);

    // Re-measure the UI whenever the layout or the app state changes
    useEffect(() => {
        const dirty = () => { labelState.blockersDirty = true; };
        const ro = new ResizeObserver(dirty);
        ro.observe(gl.domElement);
        const copy = document.querySelector('.hero-copy');
        if (copy) ro.observe(copy);
        const unsubscribe = useStore.subscribe(() => requestAnimationFrame(dirty));
        return () => {
            ro.disconnect();
            unsubscribe();
        };
    }, [gl]);

    useFrame(() => {
        if (labelState.blockersDirty) {
            labelState.blockersDirty = false;
            const stage = gl.domElement.getBoundingClientRect();
            const els = [
                ...(gl.domElement.closest('.fig-stage')?.querySelectorAll<HTMLElement>('[data-label-block]') ?? []),
                ...document.querySelectorAll<HTMLElement>('.hero-copy')
            ];
            blockers.current = els
                .map((el) => {
                    const r = el.getBoundingClientRect();
                    return { x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height };
                })
                .filter((r) => r.w && r.h);
            lastVersion.current = -1;
        }

        // Nothing moved and no labels changed: skip the DOM work entirely
        if (lastMatrix.equals(camera.matrixWorld) && lastVersion.current === labelState.version) return;
        lastMatrix.copy(camera.matrixWorld);
        lastVersion.current = labelState.version;

        const placed: Rect[] = [...blockers.current];
        const entries = [...labelRegistry.values()].sort((a, b) => b.priority - a.priority);
        for (const entry of entries) {
            v.set(entry.pos[0], entry.pos[1], entry.pos[2]).project(camera);
            const inView = v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
            const x = Math.min(Math.max((v.x * 0.5 + 0.5) * size.width - entry.width / 2, 6), size.width - entry.width - 6);
            const y = Math.max((-v.y * 0.5 + 0.5) * size.height - entry.height - 12, 6);
            const rect = { x: x - 3, y: y - 2, w: entry.width + 6, h: entry.height + 4 };
            const overlaps = placed.some((p) => rect.x < p.x + p.w && rect.x + rect.w > p.x && rect.y < p.y + p.h && rect.y + rect.h > p.y);
            const show = inView && !overlaps;
            if (show) placed.push(rect);
            entry.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            entry.el.style.opacity = show ? '1' : '0';
            entry.el.style.pointerEvents = show ? 'auto' : 'none';
        }
    });
    return null;
}

/* ---------------- Camera ---------------- */
function Rig() {
    const controls = useRef<CameraControlsImpl>(null);
    const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
    const size = useThree((s) => s.size);
    const gl = useThree((s) => s.gl);
    const selected = useStore((s) => s.selected);
    const query = useStore((s) => s.query);
    const focus = useStore((s) => s.focus);
    const resetTick = useStore((s) => s.resetTick);
    const lastMove = useRef(performance.now());
    const reduced = prefersReducedMotion();

    // The part of the canvas the subject should sit in: right of the hero text
    // on wide screens, clear of the legend / controls / info card everywhere
    const freeRect = (withCard: boolean) => {
        const W = size.width;
        const H = size.height;
        const wide = W >= 900;
        const rect = wide
            ? { left: 0, top: 120, right: W - 40, bottom: H - 96 }
            : { left: 12, top: 56, right: W - 12, bottom: H - 60 };
        if (wide) {
            const copy = document.querySelector('.hero-copy');
            const stage = gl.domElement.getBoundingClientRect();
            rect.left = copy ? copy.getBoundingClientRect().right - stage.left + 40 : W * 0.45;
            if (withCard) rect.bottom = Math.max(rect.top + H * 0.3, H - 340);
        } else if (withCard) {
            rect.bottom = Math.max(rect.top + H * 0.3, H - 180);
        }
        return rect;
    };

    // Fit a sphere into the free area: distance from the area's size, then a
    // focal offset that puts the sphere's centre in the middle of that area
    const frame = (centre: THREE.Vector3, radius: number, withCard: boolean, viewDir?: THREE.Vector3) => {
        const c = controls.current;
        if (!c) return;
        const W = size.width;
        const H = size.height;
        const r = freeRect(withCard);
        const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        const tanH = tanV * (W / H);
        const distance = Math.max(
            radius / (tanV * ((r.bottom - r.top) / H)),
            radius / (tanH * ((r.right - r.left) / W))
        ) * 1.05;
        const worldPerPx = (2 * distance * tanV) / H;
        const dx = (r.left + r.right) / 2 - W / 2;
        const dy = (r.top + r.bottom) / 2 - H / 2;
        const dir = viewDir
            ? viewDir.clone()
            : centre.lengthSq() < 0.5
                ? new THREE.Vector3(0.35, 0.35, 1)
                : centre.clone().normalize().add(new THREE.Vector3(0, 0.4, 0));
        dir.normalize();
        const pos = centre.clone().add(dir.multiplyScalar(distance));
        c.setLookAt(pos.x, pos.y, pos.z, centre.x, centre.y, centre.z, !reduced);
        // camera-controls takes the focal offset in screen axes (y points down)
        c.setFocalOffset(-dx * worldPerPx, -dy * worldPerPx, 0, !reduced);
        lastMove.current = performance.now();
    };

    useEffect(() => {
        // Wait a frame so the page has laid out (e.g. search results) before measuring
        const raf = requestAnimationFrame(() => {
            const s = useStore.getState();
            if (s.selected) {
                frame(new THREE.Vector3(...pointOf(s.selected).pos), 3.2, true);
            } else if (s.query && s.query.results.length) {
                const pts = [s.query.position, ...s.query.results.slice(0, 4).map((r) => pointOf(r.id).pos)].map((v) => new THREE.Vector3(...v));
                const sphere = new THREE.Sphere().setFromPoints(pts);
                frame(sphere.center, Math.max(sphere.radius, 2.6), false);
            } else if (s.focus) {
                const pts = POINTS.filter((p) => p.item.category === s.focus).map((p) => new THREE.Vector3(...p.pos));
                const sphere = new THREE.Sphere().setFromPoints(pts);
                frame(sphere.center, Math.max(sphere.radius, 3), false);
            } else {
                frame(new THREE.Vector3(0, 0, 0), CLOUD_RADIUS * 0.85, false, new THREE.Vector3(0.45, 0.4, 1));
            }
        });
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, query, focus, resetTick, size.width, size.height]);

    useEffect(() => {
        const c = controls.current;
        if (!c) return;
        const { ACTION } = CameraControlsImpl;
        // Leave the mouse wheel and one-finger swipes to the page so it keeps scrolling
        c.mouseButtons.wheel = ACTION.NONE;
        c.mouseButtons.middle = ACTION.NONE;
        c.mouseButtons.right = ACTION.NONE;
        c.touches.one = ACTION.NONE;
        c.touches.two = ACTION.TOUCH_DOLLY_ROTATE;
        c.touches.three = ACTION.NONE;
        gl.domElement.style.touchAction = 'pan-y';
        cameraApi.zoom = (amount: number) => {
            c.dolly(amount, !reduced);
            lastMove.current = performance.now();
        };
        const mark = () => { lastMove.current = performance.now(); };
        c.addEventListener('controlstart', mark);
        c.addEventListener('control', mark);
        return () => {
            c.removeEventListener('controlstart', mark);
            c.removeEventListener('control', mark);
            cameraApi.zoom = () => {};
        };
    }, [gl, reduced]);

    // Slow rotation while nobody is interacting
    useFrame((_, delta) => {
        const c = controls.current;
        const s = useStore.getState();
        if (!c || reduced || s.selected || s.query) return;
        if (performance.now() - lastMove.current < 4000) return;
        c.rotate(delta * 0.05, 0, false);
    });

    return (
        <CameraControls
            ref={controls}
            makeDefault
            minDistance={4}
            maxDistance={90}
            minPolarAngle={0.15}
            maxPolarAngle={Math.PI / 2 - 0.02}
            smoothTime={reduced ? 0 : 0.7}
            draggingSmoothTime={0.12}
        />
    );
}

/* ---------------- Canvas ---------------- */
export default function Scene({ paused }: { paused: boolean }) {
    return (
        <Canvas
            className="fig-canvas"
            frameloop={paused ? 'never' : 'always'}
            dpr={[1, 1.5]}
            camera={{ position: [18, 22, 70], fov: 38, near: 0.1, far: 400 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ raycaster }) => {
                raycaster.params.Points = { threshold: 0.4 };
            }}
        >
            <fog attach="fog" args={['#0c0c0b', 45, 110]} />
            <PlotFrame />
            <Edges />
            <Cloud />
            <Links />
            <QueryMarker />
            <LabelProjector />
            <Rig />
        </Canvas>
    );
}
