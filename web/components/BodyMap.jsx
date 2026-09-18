'use client';

import { useEffect, useRef, useState } from 'react';

// Вращаемая модель тела: пациент показывает, где болит, вместо того чтобы
// подбирать слова. Выбранная зона подставляется в первый ответ опроса —
// это ввод данных, а не украшение.
//
// Модель собрана из примитивов, без внешних файлов: грузить гигабайтную
// анатомию ради указания «болит живот» незачем, а лишний запрос на
// бесплатном хостинге — это лишняя секунда до первого кадра.

export const ZONES = [
  { id: 'head', label: 'Голова' },
  { id: 'neck', label: 'Шея' },
  { id: 'chest', label: 'Грудь' },
  { id: 'belly', label: 'Живот' },
  { id: 'back', label: 'Спина' },
  { id: 'arm', label: 'Рука' },
  { id: 'leg', label: 'Нога' },
];

const LABEL = Object.fromEntries(ZONES.map((z) => [z.id, z.label]));

export default function BodyMap({ selected, onSelect }) {
  const host = useRef(null);
  const api = useRef(null);
  const [hint, setHint] = useState(true);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    // Three грузится динамически: он тяжёлый, и первый экран не должен
    // его ждать. На сервере он не выполняется вовсе.
    import('three').then((THREE) => {
      if (disposed || !host.current) return;

      const el = host.current;
      const scene = new THREE.Scene();

      // Фигура занимает по высоте ~3.7 единицы с центром около y=0.4.
      // Камера отодвинута так, чтобы она помещалась целиком с полями.
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0.4, 7.4);
      camera.lookAt(0, 0.4, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);

      // Мягкий верхний свет плюс заполняющий — та же приглушённость,
      // что и в палитре страницы.
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8175, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 1.9);
      key.position.set(2.6, 4.2, 3.4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffd9c0, 0.7);
      rim.position.set(-3, 1.2, -2.5);
      scene.add(rim);

      const BASE = 0xe6ddd0;
      const HOVER = 0xc9b9a4;
      const PICKED = 0xb4584a;

      const body = new THREE.Group();
      scene.add(body);

      const parts = [];
      function part(zone, geometry, position, rotation) {
        const material = new THREE.MeshStandardMaterial({
          color: BASE, roughness: 0.72, metalness: 0.02,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        if (rotation) mesh.rotation.set(...rotation);
        mesh.userData.zone = zone;
        body.add(mesh);
        parts.push(mesh);
        return mesh;
      }

      const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 18);

      part('head', new THREE.SphereGeometry(0.36, 32, 24), [0, 1.86, 0]);
      part('neck', capsule(0.13, 0.16), [0, 1.5, 0]);

      // Грудь и живот — раздельные объёмы: это две разные жалобы,
      // и врачу важно, какую именно указал пациент.
      part('chest', capsule(0.42, 0.46), [0, 1.02, 0.02]);
      part('belly', capsule(0.36, 0.36), [0, 0.4, 0.02]);
      // Спина — две оболочки по задней поверхности корпуса, а не пластина
      // внутри него: внутренняя пластина не ловила бы клик, потому что луч
      // упирался бы в грудь раньше. Радиус чуть больше корпуса, поэтому
      // спереди оболочки не видно вовсе.
      const shell = (radius, height) => new THREE.CylinderGeometry(
        radius, radius, height, 24, 1, true, Math.PI / 2, Math.PI,
      );
      for (const [radius, height, y] of [[0.43, 0.92, 1.02], [0.37, 0.66, 0.42]]) {
        const mesh = part('back', shell(radius, height), [0, y, 0.02]);
        mesh.material.side = THREE.DoubleSide;
      }

      // Плечевые шары прячут стык руки с корпусом.
      for (const side of [-1, 1]) {
        part('arm', new THREE.SphereGeometry(0.16, 20, 16), [side * 0.42, 1.26, 0]);
        part('arm', capsule(0.115, 0.5), [side * 0.5, 0.98, 0], [0, 0, side * -0.07]);
        part('arm', capsule(0.1, 0.44), [side * 0.57, 0.4, 0], [0, 0, side * -0.04]);
        part('leg', capsule(0.16, 0.56), [side * 0.19, -0.35, 0]);
        part('leg', capsule(0.13, 0.5), [side * 0.19, -1.05, 0]);
      }

      // Мягкая тень-подложка, чтобы фигура не висела в пустоте.
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(1.05, 48),
        new THREE.MeshBasicMaterial({ color: 0x6f6b63, transparent: true, opacity: 0.12 }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.48;
      scene.add(shadow);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      let targetSpin = 0.35;
      let spin = 0.35;
      let dragging = false;
      let lastX = 0;
      let moved = 0;
      let current = null;
      let hovered = null;

      function paint() {
        for (const mesh of parts) {
          const zone = mesh.userData.zone;
          const color = zone === current ? PICKED : zone === hovered ? HOVER : BASE;
          mesh.material.color.setHex(color);
        }
      }

      function pick(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(parts, false)[0];
        return hit ? hit.object.userData.zone : null;
      }

      function onDown(event) {
        dragging = true;
        moved = 0;
        lastX = event.clientX;
        // Захват указателя — удобство, а не необходимость: если браузер
        // его не даёт, вращение всё равно работает.
        try { el.setPointerCapture?.(event.pointerId); } catch {}
      }

      function onMove(event) {
        if (dragging) {
          const delta = event.clientX - lastX;
          lastX = event.clientX;
          moved += Math.abs(delta);
          targetSpin += delta * 0.01;
          setHint(false);
          return;
        }
        const zone = pick(event);
        if (zone !== hovered) {
          hovered = zone;
          setHover(zone);
          paint();
        }
      }

      function onUp(event) {
        const wasDragging = dragging;
        dragging = false;

        // Выбор делаем до освобождения захвата: releasePointerCapture
        // бросает исключение, если захвата нет, и это оборвало бы обработчик
        // на полпути.
        // Небольшой сдвиг — это всё ещё клик, а не вращение.
        if (wasDragging && moved < 6) {
          const zone = pick(event);
          if (zone) {
            current = zone;
            setHint(false);
            paint();
            onSelect?.(zone, LABEL[zone]);
          }
        }

        try { el.releasePointerCapture?.(event.pointerId); } catch {}
      }

      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointerleave', () => {
        if (hovered) { hovered = null; setHover(null); paint(); }
      });

      function resize() {
        const { clientWidth: w, clientHeight: h } = el;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      resize();

      let frame;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      function tick() {
        frame = requestAnimationFrame(tick);
        if (!dragging && !reduced && hint) targetSpin += 0.0022;
        spin += (targetSpin - spin) * 0.09;
        body.rotation.y = spin;
        renderer.render(scene, camera);
      }
      tick();

      api.current = {
        select(zone) {
          current = zone;
          paint();
        },
      };

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        for (const mesh of parts) {
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
    // Обработчики держат ссылку на onSelect через замыкание, поэтому сцена
    // собирается один раз: пересоздавать её на каждый рендер расточительно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Выбор кнопкой с клавиатуры должен красить модель — 3D не единственный
  // способ ввода, иначе зона недоступна без мыши.
  useEffect(() => {
    api.current?.select(selected || null);
  }, [selected]);

  return (
    <div>
      <div className="body-stage" ref={host}>
        <div className="hint" style={{ opacity: hint ? 1 : 0 }}>
          потяните, чтобы повернуть
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>
        {hover ? `Нажмите, чтобы выбрать: ${LABEL[hover]}` : 'Нажмите на часть тела или выберите из списка.'}
      </p>
      <div className="zones">
        {ZONES.map((zone) => (
          <button
            key={zone.id}
            type="button"
            className="zone"
            data-on={selected === zone.id}
            onClick={() => onSelect?.(zone.id, zone.label)}
          >
            {zone.label}
          </button>
        ))}
      </div>
    </div>
  );
}
