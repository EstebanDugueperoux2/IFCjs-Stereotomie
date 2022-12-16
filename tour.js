import { projects } from "./projects.js";
const currentUrl = window.location.href;
const currentProjectGroupYear = currentUrl.substring(currentUrl.lastIndexOf("=") + 1);
const currentProjectYear = currentProjectGroupYear.substring(0, 4);
const h1Year = document.getElementById("h1-year");
h1Year.textContent = currentProjectYear;
const currentProjectGroupHref = currentProjectGroupYear.substring(5);
const currentProjectGroup = currentProjectGroupHref.replaceAll('%20', ' ');
const currentProject = projects.find(
  (project) => project.group === currentProjectGroup && project.year === currentProjectYear
);
const groupAndStudents = document.querySelector("h2");
groupAndStudents.textContent =
  currentProject.group + ": " + currentProject.students;

import {
  Box3,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  ReinhardToneMapping,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
} from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { IFCLoader } from "web-ifc-three";

let camera, scene, renderer, controls;

const objects = [];

let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let prevTime = performance.now();
const velocity = new Vector3();
const direction = new Vector3();

init();
animate();

function init() {
  // SCENE

  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.y = 1.6;

  scene = new Scene();
  scene.background = new Color(0xcac7c7);

  const leftDirectionalLight = new DirectionalLight(0x111111, 20);
  leftDirectionalLight.position.set(0, 20, 15);
  leftDirectionalLight.castShadow = true;
  scene.add(leftDirectionalLight);

  leftDirectionalLight.shadow.mapSize.width = 512; // default
  leftDirectionalLight.shadow.mapSize.height = 512; // default
  leftDirectionalLight.shadow.camera.near = 0.5; // default
  leftDirectionalLight.shadow.camera.far = 500;

  const rightDirectionalLight = new DirectionalLight(0x111111, 10);
  rightDirectionalLight.position.set(0, 20, -15);
  rightDirectionalLight.castShadow = true;
  scene.add(rightDirectionalLight);

  rightDirectionalLight.shadow.mapSize.width = 512; // default
  rightDirectionalLight.shadow.mapSize.height = 512; // default
  rightDirectionalLight.shadow.camera.near = 0.5; // default
  rightDirectionalLight.shadow.camera.far = 500;

  // CONTROLS

  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  blocker.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "flex";
  });

  scene.add(controls.getObject());

  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  raycaster = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 10);

  // HDR LIGHTING

  new RGBELoader()
    .setPath("textures/equirectangular/")
    .load("abandoned_greenhouse_1k.hdr", function (texture) {
      texture.mapping = EquirectangularReflectionMapping;
      scene.environment = texture;

      // FLOOR: TRYING THINGS WITH GLTF UVS: THIS DONT WORK NOW WITH OUR IFC CAUSE THEY DONT HAVE UV WE CAN CATCH
      const gltfLoader = new GLTFLoader();
      gltfLoader.load("models/floor/floor.glb", function (floor) {
        const model = floor.scene;
        model.traverse(function (mesh) {
          if (mesh.isMesh) {
            let geometry = mesh.geometry;
            let uvAttribute = geometry.attributes.uv;
            for (let i = 0; i < uvAttribute.count; i++) {
              let u = uvAttribute.getX(i);
              let v = uvAttribute.getY(i);

              // do something with uv
              let uu = u / 2;
              let vv = v / 2;

              // write values back to attribute
              uvAttribute.setXY(i, uu, vv);
              uvAttribute.needsUpdate = true;
            }
            mesh.receiveShadow = true;
          }
        });
        scene.add(model);
      });

      // MODEL
      const loadingElem = document.getElementById("tour-loading-container");
      const loadingText = document.getElementById("tour-loading-text");
      if (currentProjectGroup == "Pavillon La Hire 2021") {
        camera.position.z = 4;
        gltfLoader.load(
          "models/2021/Pavillon La Hire 2021.glb",
          function (model) {
            blocker.style.display = "flex";
            instructions.style.display = "block";
            loadingElem.style.display = "none";
            scene.add(model.scene);
          },
          function (progress) {
            const current = (progress.loaded / progress.total) * 100;
            const formatted = Math.trunc(current * 100) / 100;
            loadingText.textContent = `Chargement: ${formatted}%`;
          }
        );
      } else {
        const ifcLoader = new IFCLoader();
        ifcLoader.ifcManager.setWasmPath("./wasm-0-0-36/");
        ifcLoader.setPath("./models/" + currentProjectYear + "/");
        ifcLoader.load(
          currentProject.group + ".ifc",
          function (model) {
            blocker.style.display = "flex";
            instructions.style.display = "block";
            loadingElem.style.display = "none";

            // CENTER
            const box = new Box3().setFromObject(model);
            const center = box.getCenter(new Vector3());
            model.position.x += model.position.x - center.x;
            model.position.z += model.position.z - center.z;
            const boxSize = box.getSize(new Vector3());
            camera.position.z = boxSize.z + 4;

            // MATERIAL
            const woodMaterial = new MeshStandardMaterial({
              color: 0xdfb25e,
            });
            model.traverse(function (mesh) {
              if (mesh.isMesh) {
                mesh.material = woodMaterial;
                mesh.castShadow = true;
                mesh.receiveShadow = false;
              }
            });

            scene.add(model);
          },
          function (progress) {
            const current = (progress.loaded / progress.total) * 100;
            const formatted = Math.trunc(current * 100) / 100;
            loadingText.textContent = `Chargement: ${formatted}%`;
          }
        );
      }
    });

  // RENDERER

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ReinhardToneMapping;
  renderer.toneMappingExposure = 2;

  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();

  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(controls.getObject().position);
    raycaster.ray.origin.y -= 10;

    const intersections = raycaster.intersectObjects(objects, false);

    const onObject = intersections.length > 0;

    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    //velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 20.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 20.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
  }

  prevTime = time;

  renderer.render(scene, camera);
}
