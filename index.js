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
  
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {IFCLoader} from "web-ifc-three/IFCLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

document.body.onmousedown = function(e) {
    if(e.button == 1) {
        e.preventDefault();
        return false;
    }
}

let canvas, renderer;

const scenes = [];

init();
animate();

function init() {

    canvas = document.getElementById( "c" );

    const content = document.getElementById( 'content' );
    const projectsItems = Array.from(content.children);

    const templateProjectItem = projectsItems[0];
    const baseURL = `./viewer.html`;      

    for ( let project of projects ) {

        const scene = new Scene();
        scene.background = new Color( 0xdddddd );

        const group = new Group();
        scene.add( group );

        // make a list item
        const element = document.createElement( 'div' );
        element.className = 'list-item';

        const sceneElement = document.createElement( 'div' );
        sceneElement.classList.add('scene-element');
        element.appendChild( sceneElement );

        const descriptionElement = document.createElement( 'a' );
        descriptionElement.href = baseURL + `?id=${project.id}`;
        descriptionElement.target = '_blank';
        descriptionElement.classList.add('description-element');
        element.appendChild( descriptionElement );

        const groupElement = document.createElement( 'p' );
        if (project.id == 0){
            groupElement.innerText = 'Pavillon La Hire'
        }
        else{
            groupElement.innerText = 'Groupe ' + project.group + ' : ' + project.students;
        }
        descriptionElement.appendChild( groupElement );

        // the element that represents the area we want to render the scene
        scene.userData.element = sceneElement;
        content.appendChild( element );

        const camera = new OrthographicCamera( -10, 10, 10, -10, 1, 1000 );
        scene.userData.camera = camera;

        const controls = new OrbitControls( scene.userData.camera, scene.userData.element );
        scene.userData.controls = controls;  

        if (project.id == 0) {
            				
            new RGBELoader()
            .setPath( 'textures/equirectangular/' )
            .load( 'paul_lobe_haus_1k.hdr', function ( texture ) {

                texture.mapping = EquirectangularReflectionMapping;
                scene.environment = texture;

                const gltfLoader = new GLTFLoader();
                gltfLoader.setPath('models/');
                gltfLoader.load( 'Pavillon La Hire.glb', function ( gltf ) {

                    const model = gltf.scene;

                    const box = new Box3().setFromObject(model);
                    const center = box.getCenter(new Vector3());
                    model.position.x += (model.position.x - center.x);
                    model.position.y += (model.position.y - center.y);
                    model.position.z += (model.position.z - center.z);
                    const boxSize = box.getSize(new Vector3());
                    camera.position.z = (boxSize.z + 10);
                    const cameraFrustum = (1.3);
                    camera.left = -cameraFrustum;
                    camera.right = cameraFrustum;
                    camera.top = cameraFrustum;
                    camera.bottom = -cameraFrustum;
                    camera.updateProjectionMatrix();
                    controls.minDistance = ((boxSize.x + boxSize.z)/10);
                    controls.maxDistance = (boxSize.x + boxSize.z);

                    group.add( model );
                    render();
                });
            });
        }

        
        else {

            const ifcLoader = new IFCLoader();
            ifcLoader.ifcManager.setWasmPath('./wasm-0-0-36/');
            ifcLoader.load( 'models/' + project.group + '.ifc', function ( model ) {

                const box = new Box3().setFromObject(model);
                const center = box.getCenter(new Vector3());
                model.position.x += (model.position.x - center.x);
                model.position.y += (model.position.y - center.y);
                model.position.z += (model.position.z - center.z);
                const boxSize = box.getSize(new Vector3());
                camera.position.z = (boxSize.z + 10);
                const cameraFrustum = ((Math.sqrt((boxSize.x * boxSize.x) + (boxSize.y * boxSize.y))) / 1.8);
                camera.left = -cameraFrustum;
                camera.right = cameraFrustum;
                camera.top = cameraFrustum;
                camera.bottom = -cameraFrustum;
                camera.updateProjectionMatrix();
                controls.minDistance = ((boxSize.x + boxSize.z)/10);
                controls.maxDistance = (boxSize.x + boxSize.z);

                sceneElement.onmousedown = () => {
                    const gridHelper = new GridHelper( 10, 10 );
                    gridHelper.position.y = (-boxSize.y / 2);
                    group.add( gridHelper ); 
                }

                const material = new MeshStandardMaterial ({
                    color: 0xDFB25E,
                });
                model.traverse((child, i) => {
                    if (child.isMesh) {
                        child.material = material;
                    }                    
                });

                group.add( model );

            } );
                
            const light = new DirectionalLight( 0xffffff, 0.8 );
            light.position.set( 1, 1, 1 );
            scene.add( light );

        }

        scene.add( new HemisphereLight( 0xaaaaaa, 0x444444, 0.8 ) );

        scenes.push( scene );

    }
    
    renderer = new WebGLRenderer( { canvas: canvas, antialias: true } );
    renderer.setClearColor( 0xffffff, 1 );
    renderer.setPixelRatio( window.devicePixelRatio );

    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = sRGBEncoding;
}

function updateSize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if ( canvas.width !== width || canvas.height !== height ) {
        renderer.setSize( width, height, false );
    }
}

function animate() {
    render();
    requestAnimationFrame( animate );
}

function render() {
    updateSize();
    canvas.style.transform = `translateY(${window.scrollY}px)`;
    renderer.setClearColor( 0xffffff );
    renderer.setScissorTest( false );
    renderer.clear();
    renderer.setClearColor( 0x555555 );
    renderer.setScissorTest( true );
    scenes.forEach( function ( scene ) {
        scene.children[ 0 ].rotation.y = Date.now() * 0.0001;
        const element = scene.userData.element;
        const rect = element.getBoundingClientRect();
        if ( rect.bottom < 0 || rect.top > renderer.domElement.clientHeight ||
                rect.right < 0 || rect.left > renderer.domElement.clientWidth ) {
            return; 
        }
        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;
        const left = rect.left;
        const bottom = renderer.domElement.clientHeight - rect.bottom;

        renderer.setViewport( left, bottom, width, height );
        renderer.setScissor( left, bottom, width, height );

        const camera = scene.userData.camera;

        renderer.render( scene, camera );

    } );

}