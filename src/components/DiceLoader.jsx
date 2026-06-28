import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';

const DiceLoader = ({ isDataLoaded }) => {
    const containerRef = useRef(null);
    const animationRef = useRef({ tl: null, timeout: null, frameId: null });

    useEffect(() => {
        if (!containerRef.current) return;

        /* ---------- SCENE SETUP ---------- */
        const container = containerRef.current;

        // Clear any existing children just in case (strict mode)
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const scene = new THREE.Scene();

        const parentEl = container.parentElement;
        const width = parentEl.clientWidth || window.innerWidth;
        const height = Math.max(parentEl.clientHeight || window.innerHeight / 2, 400);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 4, 8);
        camera.lookAt(0, 0.5, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        /* ---------- LIGHTING ---------- */
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 3);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 25;
        dirLight.shadow.camera.left = -5;
        dirLight.shadow.camera.right = 5;
        dirLight.shadow.camera.top = 5;
        dirLight.shadow.camera.bottom = -5;
        dirLight.shadow.bias = -0.001;
        scene.add(dirLight);

        const neonLight = new THREE.PointLight(0x3b82f6, 2, 10);
        neonLight.position.set(2, 1, 0);
        scene.add(neonLight);

        /* ---------- SOFT SHADOW GROUND ---------- */
        const planeGeom = new THREE.PlaneGeometry(50, 50);
        const planeMat = new THREE.ShadowMaterial({ opacity: 0.5 });
        const plane = new THREE.Mesh(planeGeom, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0;
        plane.receiveShadow = true;
        scene.add(plane);

        /* ---------- EXACT PIP POSITIONS ---------- */
        const s = 0.32;
        const pipCoords = {
            1: [[0, 0]],
            2: [[-s, s], [s, -s]],
            3: [[-s, s], [0, 0], [s, -s]],
            4: [[-s, s], [s, s], [-s, -s], [s, -s]],
            5: [[-s, s], [s, s], [0, 0], [-s, -s], [s, -s]],
            6: [[-s, s], [-s, 0], [-s, -s], [s, s], [s, 0], [s, -s]]
        };

        /* ---------- CREATE DIE FUNCTION ---------- */
        function createDie(isBlueWireframe) {
            const size = 1.2;
            const radius = 0.18;
            const halfSize = size / 2;

            const group = new THREE.Group();
            const geom = new RoundedBoxGeometry(size, size, size, 6, radius);

            let boxMat;
            if (isBlueWireframe) {
                boxMat = new THREE.MeshStandardMaterial({
                    color: 0x0a0d14,
                    roughness: 0.2,
                    transparent: true,
                    opacity: 0.85
                });
            } else {
                boxMat = new THREE.MeshStandardMaterial({
                    color: 0x1f242e,
                    roughness: 0.5,
                    metalness: 0.1
                });
            }

            const cube = new THREE.Mesh(geom, boxMat);
            cube.castShadow = true;
            cube.receiveShadow = true;
            group.add(cube);

            if (isBlueWireframe) {
                const edges = new THREE.EdgesGeometry(geom);
                const lineMat = new THREE.LineBasicMaterial({
                    color: 0x3b82f6,
                    transparent: true,
                    opacity: 0.9
                });
                const wireframe = new THREE.LineSegments(edges, lineMat);
                cube.add(wireframe);
            }

            const pipRadius = 0.11;
            const pipDepth = 0.04;
            const pipGeom = new THREE.CylinderGeometry(pipRadius, pipRadius, pipDepth, 32);
            pipGeom.rotateX(Math.PI / 2);

            const pipColor = isBlueWireframe ? 0x3b82f6 : 0x94a3b8;
            const pipMat = new THREE.MeshStandardMaterial({
                color: pipColor,
                roughness: 0.8,
                emissive: isBlueWireframe ? 0x3b82f6 : 0x000000,
                emissiveIntensity: isBlueWireframe ? 0.8 : 0
            });

            const faces = [
                { rot: [0, 0, 0], face: 1 },
                { rot: [0, Math.PI, 0], face: 6 },
                { rot: [0, Math.PI / 2, 0], face: 2 },
                { rot: [0, -Math.PI / 2, 0], face: 5 },
                { rot: [-Math.PI / 2, 0, 0], face: 3 },
                { rot: [Math.PI / 2, 0, 0], face: 4 }
            ];

            faces.forEach(f => {
                const faceGroup = new THREE.Group();
                faceGroup.rotation.set(...f.rot);

                pipCoords[f.face].forEach(p => {
                    const pip = new THREE.Mesh(pipGeom, pipMat);
                    pip.position.set(p[0], p[1], halfSize - 0.015);
                    pip.receiveShadow = true;
                    faceGroup.add(pip);
                });

                cube.add(faceGroup);
            });

            return group;
        }

        /* ---------- SCENE ASSEMBLY ---------- */
        const dice1 = createDie(false);
        const dice2 = createDie(true);

        dice1.position.set(-0.75, 0.6, 0.5);
        dice2.position.set(0.65, 0.6, -0.6);

        scene.add(dice1);
        scene.add(dice2);

        /* ---------- GSAP PHYSICS ANIMATION ---------- */
        let stopped = false;
        function rollDice() {
            if (stopped) return;

            const getTargetRot = (currentRot) => {
                const baseRot = Math.round(currentRot / (Math.PI / 2)) * (Math.PI / 2);
                const randomSpins = Math.floor(Math.random() * 4) * (Math.PI / 2);
                return baseRot + randomSpins + (Math.PI * 4);
            };

            const t1 = { x: getTargetRot(dice1.rotation.x), y: getTargetRot(dice1.rotation.y), z: getTargetRot(dice1.rotation.z) };
            const t2 = { x: getTargetRot(dice2.rotation.x), y: getTargetRot(dice2.rotation.y), z: getTargetRot(dice2.rotation.z) };

            const tl = gsap.timeline({
                onComplete: () => {
                    if (!stopped) {
                        animationRef.current.timeout = setTimeout(rollDice, 400);
                    }
                }
            });
            animationRef.current.tl = tl;

            tl.to([dice1.position, dice2.position], {
                y: 3.5, duration: 0.5, ease: "power2.out", stagger: 0.05
            }, 0);

            tl.to(dice1.rotation, { x: t1.x, y: t1.y, z: t1.z, duration: 1.2, ease: "power3.inOut" }, 0);
            tl.to(dice2.rotation, { x: t2.x, y: t2.y, z: t2.z, duration: 1.2, ease: "power3.inOut" }, 0.05);

            tl.to([dice1.position, dice2.position], {
                y: 0.6, duration: 0.6, ease: "bounce.out", stagger: 0.05
            }, 0.5);
        }

        rollDice();

        /* ---------- RENDER LOOP ---------- */
        function animate() {
            if (!stopped) {
                animationRef.current.frameId = requestAnimationFrame(animate);
                renderer.render(scene, camera);
            }
        }
        animate();

        /* ---------- RESPONSIVE ---------- */
        const handleResize = () => {
            if (!containerRef.current) return;
            const parent = containerRef.current.parentElement;
            const w = parent.clientWidth || window.innerWidth;
            const h = Math.max(parent.clientHeight || window.innerHeight / 2, 400);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // CLEANUP
        return () => {
            stopped = true;
            if (animationRef.current.frameId) cancelAnimationFrame(animationRef.current.frameId);
            if (animationRef.current.timeout) clearTimeout(animationRef.current.timeout);
            if (animationRef.current.tl) animationRef.current.tl.kill();
            window.removeEventListener('resize', handleResize);

            // Dispose scene objects
            renderer.dispose();
            scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });

            if (containerRef.current) {
                while (containerRef.current.firstChild) {
                    containerRef.current.removeChild(containerRef.current.firstChild);
                }
            }
        };
    }, []);

    return (
        <div
            style={{
                width: '100%',
                minHeight: '400px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
            }}
        >
            <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}></div>
            <div style={{ position: 'absolute', bottom: '20px', fontFamily: 'sans-serif', color: '#666', fontWeight: 600 }}>Syncing...</div>
        </div>
    );
};

export default DiceLoader;
