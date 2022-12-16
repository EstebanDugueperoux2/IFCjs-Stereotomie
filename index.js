import { projects } from "./projects.js";

import {
  Box3,
  DirectionalLight,
  GridHelper,
  Scene,
  Vector3,
  WebGLRenderer,
  MeshStandardMaterial,
  Color,
  HemisphereLight,
  EquirectangularReflectionMapping,
  ACESFilmicToneMapping,
  sRGBEncoding,
  OrthographicCamera,
  Group,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { setQuaternionFromProperEuler } from "three/src/math/MathUtils.js";

document.body.onmousedown = function (e) {
  if (e.button == 1) {
    e.preventDefault();
    return false;
  }
};

let canvas, renderer;

const scenes = [];

init();
animate();

function init() {
  canvas = document.getElementById("c");

  const content = document.getElementById("content");
  const projectsItems = Array.from(content.children);

  const templateProjectItem = projectsItems[0];
  const baseURL = `./viewer.html`;

  for (let project of projects) {
    //if (project.group == "Pavillon La Hire 2021" || project.year == year) {

    const scene = new Scene();
    scene.background = new Color(0xdddddd);

    const group = new Group();
    scene.add(group);

    // make a list item
    const element = document.createElement("div");
    element.className = "list-item";
    if (project.group !== "Pavillon La Hire 2021") {
      element.classList.add(project.year);
    }

    //make a 3D scene
    const sceneElement = document.createElement("div");
    sceneElement.classList.add("scene-element");
    element.appendChild(sceneElement);

    //make a loading element on top of 3D scene
    const loadingContainer = document.createElement("div");
    loadingContainer.className = "loading-container";
    sceneElement.appendChild(loadingContainer);

    const loadingIcon = document.createElement("img");
    loadingIcon.src = "./epfl/square.png";
    loadingIcon.className = "loading-icon";
    loadingContainer.appendChild(loadingIcon);

    const loadingText = document.createElement("p");
    loadingText.className = "loading-text";
    loadingText.textContent = "Chargement:";
    loadingContainer.appendChild(loadingText);

    //make a description
    const descriptionElement = document.createElement("a");
    descriptionElement.href = baseURL + `?id=${project.year + "_" + project.group}`;
    descriptionElement.target = "_blank";
    descriptionElement.classList.add("description-element");
    element.appendChild(descriptionElement);

    const groupElement = document.createElement("p");
    if (project.group == "Pavillon La Hire 2021") {
      groupElement.innerText = "Pavillon La Hire 2021";
    } else {
      groupElement.innerText =
        "Groupe " + project.group + " : " + project.students;
    }
    descriptionElement.appendChild(groupElement);

    // the element that represents the area we want to render the scene
    scene.userData.element = sceneElement;
    content.appendChild(element);

    const camera = new OrthographicCamera(-10, 10, 10, -10, 1, 1000);
    scene.userData.camera = camera;

    const controls = new OrbitControls(
      scene.userData.camera,
      scene.userData.element
    );
    scene.userData.controls = controls;

    if (project.group == "Pavillon La Hire 2021") {
      new RGBELoader()
        .setPath("textures/equirectangular/")
        .load("paul_lobe_haus_1k.hdr", function (texture) {
          texture.mapping = EquirectangularReflectionMapping;
          scene.environment = texture;

          const gltfLoader = new GLTFLoader();
          gltfLoader.setPath("models/" + project.year + "/");
          gltfLoader.load(
            "Pavillon La Hire 2021.glb",

            function (gltf) {
              loadingContainer.style.display = "none";

              const model = gltf.scene;

              const box = new Box3().setFromObject(model);
              const center = box.getCenter(new Vector3());
              model.position.x += model.position.x - center.x;
              model.position.y += model.position.y - center.y;
              model.position.z += model.position.z - center.z;
              const boxSize = box.getSize(new Vector3());
              camera.position.z = boxSize.z + 10;
              const cameraFrustum = 1.3;
              camera.left = -cameraFrustum;
              camera.right = cameraFrustum;
              camera.top = cameraFrustum;
              camera.bottom = -cameraFrustum;
              camera.updateProjectionMatrix();
              controls.minDistance = (boxSize.x + boxSize.z) / 10;
              controls.maxDistance = boxSize.x + boxSize.z;

              group.add(model);
              render();
            },

            function (progress) {
              const current = (progress.loaded / progress.total) * 100;
              const formatted = Math.trunc(current * 100) / 100;
              loadingText.textContent = `Chargement: ${formatted}%`;
            }
          );
        });
    } else {
      const ifcLoader = new IFCLoader();
      ifcLoader.ifcManager.setWasmPath("./wasm-0-0-36/");
      ifcLoader.load(
        "models/" + project.year + "/" + project.group + ".ifc",

        function (model) {
          loadingContainer.style.display = "none";

          const box = new Box3().setFromObject(model);
          const center = box.getCenter(new Vector3());
          model.position.x += model.position.x - center.x;
          model.position.y += model.position.y - center.y;
          model.position.z += model.position.z - center.z;
          const boxSize = box.getSize(new Vector3());
          camera.position.z = boxSize.z + 10;
          const cameraFrustum =
            Math.sqrt(boxSize.x * boxSize.x + boxSize.y * boxSize.y) / 1.8;
          camera.left = -cameraFrustum;
          camera.right = cameraFrustum;
          camera.top = cameraFrustum;
          camera.bottom = -cameraFrustum;
          camera.updateProjectionMatrix();
          controls.minDistance = (boxSize.x + boxSize.z) / 10;
          controls.maxDistance = boxSize.x + boxSize.z;

          sceneElement.onmousedown = () => {
            const gridHelper = new GridHelper(10, 10);
            gridHelper.position.y = -boxSize.y / 2;
            group.add(gridHelper);
          };

          const material = new MeshStandardMaterial({
            color: 0xdfb25e,
          });
          model.traverse((child, i) => {
            if (child.isMesh) {
              child.material = material;
            }
          });

          group.add(model);
        },

        function (progress) {
          const current = (progress.loaded / progress.total) * 100;
          const formatted = Math.trunc(current * 100) / 100;
          loadingText.textContent = `Chargement: ${formatted}%`;
        }
      );

      const light = new DirectionalLight(0xffffff, 0.8);
      light.position.set(1, 1, 1);
      scene.add(light);
    }

    scene.add(new HemisphereLight(0xaaaaaa, 0x444444, 0.8));

    scenes.push(scene);
  }
  //}

  renderer = new WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setClearColor(0xffffff, 1);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = sRGBEncoding;
}

function updateSize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
  }
}

function animate() {
  render();
  requestAnimationFrame(animate);
}

function render() {
  updateSize();
  canvas.style.transform = `translateY(${window.scrollY}px)`;
  renderer.setClearColor(0xffffff);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setClearColor(0x555555);
  renderer.setScissorTest(true);
  scenes.forEach(function (scene) {
    scene.children[0].rotation.y = Date.now() * 0.0001;
    const element = scene.userData.element;
    const rect = element.getBoundingClientRect();
    if (
      rect.bottom < 0 ||
      rect.top > renderer.domElement.clientHeight ||
      rect.right < 0 ||
      rect.left > renderer.domElement.clientWidth
    ) {
      return;
    }
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const left = rect.left;
    const bottom = renderer.domElement.clientHeight - rect.bottom;

    renderer.setViewport(left, bottom, width, height);
    renderer.setScissor(left, bottom, width, height);

    const camera = scene.userData.camera;

    renderer.render(scene, camera);
  });
}

let year = 2022;
const h1Year = document.getElementById("h1-year");
const dropbtn = document.getElementById("dropbtn");
const year2022Btn = document.getElementById("year-2022-btn");
const year2021Btn = document.getElementById("year-2021-btn");

/* When the user clicks on the button, 
toggle between hiding and showing the dropdown content */
dropbtn.onclick = () => {
  document.getElementById("myDropdown").classList.toggle("show");
};

// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
  if (!event.target.matches(".dropbtn")) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

year2022Btn.disabled = true;

const projects2022 = document.getElementsByClassName("2022");
const projects2021 = document.getElementsByClassName("2021");
for (let project2021 of projects2021) {
  project2021.style.display = "none";
}

year2022Btn.onclick = () => {
  year = 2022;
  console.log(year);
  h1Year.textContent = year;
  dropbtn.textContent = year;
  year2022Btn.disabled = true;
  year2021Btn.disabled = false;
  for (let project2022 of projects2022) {
    project2022.style.display = "inline-block";
  }
  for (let project2021 of projects2021) {
    project2021.style.display = "none";
  }
};
year2021Btn.onclick = () => {
  year = 2021;
  console.log(year);
  h1Year.textContent = year;
  dropbtn.textContent = year;
  year2022Btn.disabled = false;
  year2021Btn.disabled = true;
  for (let project2022 of projects2022) {
    project2022.style.display = "none";
  }
  for (let project2021 of projects2021) {
    project2021.style.display = "inline-block";
  }
};
