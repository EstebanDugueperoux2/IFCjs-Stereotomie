import { projects } from "./projects.js";
const currentUrl = (window.location).href;
const currentProjectID = currentUrl.substring(currentUrl.lastIndexOf('=') + 1);
const currentProject = projects.find(project => project.id === currentProjectID);
const groupAndStudents = document.querySelector('h2');
groupAndStudents.textContent = currentProject.group + ": " + currentProject.students;

import {
    ACESFilmicToneMapping,
    AxesHelper,
    Color,
    EquirectangularReflectionMapping,
    GridHelper,
    sRGBEncoding,
} from "three";

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { IfcViewerAPI } from 'web-ifc-viewer';

// SCENE

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(0xffffff) });
viewer.IFC.setWasmPath('../../../');

if (currentProjectID > 0) {
    // Create grid and axes
    viewer.grid.setGrid();
    viewer.axes.setAxes();
}  

async function loadIfc() {
    const model = await viewer.IFC.loadIfcUrl('./models/' + currentProject.group + '.ifc');
    await viewer.shadowDropper.renderShadow(model.modelID);
}

loadIfc('./path/to/file.ifc');

// BUTTONS
const buttonInstructions = document.getElementById('button-instructions');
const buttonInstructionsBase = 'Sélectionner un outil.';
buttonInstructions.textContent = buttonInstructionsBase;

// INFOS BUTTON
const infosButton = document.getElementById('infos-button');
const ifcPropertyMenu = document.getElementById('ifc-property-menu');
const propertiesGUI = document.getElementById("ifc-property-menu-root");

function infosButtonActive () {
    infosButton.classList.add('active-button');
    buttonInstructions.textContent = 'Double-cliquer sur un élément pour le sélectionner et afficher ses propriétés.';
    ifcPropertyMenu.style.display = 'block';

    window.onmousemove = () => {
            viewer.IFC.selector.prePickIfcItem();
    }

    window.ondblclick = async () => {
            const result = await viewer.IFC.selector.highlightIfcItem();
            if (!result) return;
            const { modelID, id } = result;
            const props = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, id, true, false);
            createPropsMenu(props);
            const psets = await viewer.IFC.loader.ifcManager.getPropertySets(modelID, id);
                for (const pset of psets) {
                    const psetsRealValues = [];
                    for (const psetProp of pset.HasProperties) {
                        const psetId = psetProp.value;
                        const psetValue = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, psetId);
                        psetsRealValues.push(psetValue);
                    }
                    pset.HasProperties = psetsRealValues;
                }
            createPsetsMenu(psets);
    }

    function createPropsMenu(props) {
            removeAllChildren(propertiesGUI);
            for (let key in props) {
                if(
                    key === 'expressID' || 
                    key === 'GlobalId' || 
                    key === 'Name' || 
                    key === 'Description'
                )
                createPropsEntry(key, props[key]);
            }
    }

    function createPropsEntry(key, value) {
            const propContainer = document.createElement("div");
            propContainer.classList.add("ifc-property-item");

            if(value === null || value === undefined) value = "undefined";
            else if(value.value) value = value.value;

            const keyElement = document.createElement("div");
            keyElement.textContent = key + ':';
            propContainer.appendChild(keyElement);

            const valueElement = document.createElement("div");
            valueElement.classList.add("ifc-property-value");
            valueElement.textContent = value;
            propContainer.appendChild(valueElement);

            propertiesGUI.appendChild(propContainer);
    }

    function createPsetsMenu(psets) {
        for (const pset of psets) {
            for (const prop of pset.HasProperties) {
                const propName = prop.Name.value;
                const propNominalValue = prop.NominalValue.value;                
                if(
                    propName === 'Auteur' || 
                    propName === 'Catégorie de matériau'|| 
                    propName === 'Masse'||  
                    propName === 'Surface'|| 
                    propName === 'Volume'
                )
                createPsetsEntry(propName, propNominalValue);
                if(
                    propName.includes('Longueur marg')
                )
                createPsetsEntry('Longueur margée du brut', propNominalValue);
                if(
                    propName.includes('Largeur marg')
                )
                createPsetsEntry('Largeur margée du brut', propNominalValue);
                if(
                    propName.includes('Hauteur marg')
                )
                createPsetsEntry('Hauteur margée du brut', propNominalValue);
            }
        }
    }

    function createPsetsEntry(key, value) {
        const psetContainer = document.createElement("div");
        psetContainer.classList.add("ifc-property-item");

        if(value === null || value === undefined) value = "undefined";
        else if(value.value) value = value.value;

        if(typeof value === 'number') value = Math.round(value*1000)/1000;

        const psetKeyElement = document.createElement("div");
        psetKeyElement.textContent = key + ':';
        psetContainer.appendChild(psetKeyElement);

        const psetValueElement = document.createElement("div");
        psetValueElement.classList.add("ifc-property-value");
        psetValueElement.textContent = value;
        psetContainer.appendChild(psetValueElement);

        propertiesGUI.appendChild(psetContainer);
    }

    function removeAllChildren(element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
    }
}

function infosButtonDisable () {
    infosButton.classList.remove('active-button');
    ifcPropertyMenu.style.display = 'none';
    window.onmousemove = () => {};
    window.ondblclick = () => {};
    viewer.IFC.selector.unpickIfcItems();
    viewer.IFC.selector.unHighlightIfcItems();
    propertiesGUI.textContent = '';
    buttonInstructions.textContent = buttonInstructionsBase;
};

let infosButtonBoolean = false;
infosButton.onclick = () => {
    infosButtonBoolean = !infosButtonBoolean;
    if (infosButtonBoolean) {
        infosButtonActive ();
    } else {
        infosButtonDisable();
    };
};

// CLIPPER BUTTON
const clipperButton = document.getElementById('clipper-button');

function clipperButtonActive () {
    clipperButton.classList.add('active-button')
    buttonInstructions.textContent = 'Double-clic sur une face pour ajouter un plan de coupe; delete pour supprimer.';
    viewer.clipper.active = true;
    window.ondblclick = () => {
        viewer.clipper.createPlane();
    }
    window.onkeydown = (event) => {
        if(event.code === 'Delete') {
            viewer.clipper.deleteAllPlanes();
        }
    }
}

function clipperButtonDisable () {
    clipperButton.classList.remove('active-button');
    viewer.clipper.active = false;
    buttonInstructions.textContent = buttonInstructionsBase;
}

let clipperButtonBoolean = false;
clipperButton.onclick = () => {
    clipperButtonBoolean = !clipperButtonBoolean;
    if (clipperButtonBoolean) {
        clipperButtonActive ();
    } else {
        clipperButtonDisable ();
    };
}

// DIMENSIONS BUTTON
const dimensionsButton = document.getElementById('dimensions-button');

function dimensionsButtonActive () {
    dimensionsButton.classList.add('active-button');
    buttonInstructions.textContent = 'Double-clic sur deux points pour ajouter une cote; delete pour supprimer.';
    viewer.dimensions.previewActive = true;
    viewer.dimensions.active = true;
    window.ondblclick = () => {
        viewer.dimensions.create();
    }
    window.onkeydown = (event) => {
        if(event.code === 'Delete') {
            viewer.dimensions.deleteAll();
        }
    }
}

function dimensionsButtonDisable () {
    dimensionsButton.classList.remove('active-button');
    viewer.dimensions.active = false;
    buttonInstructions.textContent = buttonInstructionsBase;
}

let dimensionsButtonBoolean = false;
dimensionsButton.onclick = () => {
    dimensionsButtonBoolean = !dimensionsButtonBoolean;
    if (dimensionsButtonBoolean) {
        dimensionsButtonActive ();
    } else {
        dimensionsButtonDisable ();
    };
}


// TOUR BUTTON
const tourButton = document.getElementById('tour-button');
tourButton.onclick = () => {
    const baseURL = `./tour.html`; 
    location.href = baseURL + `?id=${currentProjectID}`;
}
function tourButtonDisable () {
    tourButton.classList.remove('active-button');
    buttonInstructions.textContent = buttonInstructionsBase;
}

// ESC ALL BUTTONS
function escAllButtons () {
    infosButtonDisable();
    infosButtonBoolean = false;
    clipperButtonDisable();
    clipperButtonBoolean = false;
    dimensionsButtonDisable();
    dimensionsButtonBoolean = false;
    tourButtonDisable();
    buttonInstructions.textContent = buttonInstructionsBase;
}
document.addEventListener('keydown', function(event){
	if(event.key === "Escape"){
        escAllButtons();
	}
});
    
// PHOTOMESH BUTTON FOR PAVILLON LA HIRE
const photomeshButton = document.getElementById('photomesh-button');
if (currentProjectID > 0) {
    photomeshButton.style.display = 'none';
}
else{
    const gridHelper = new GridHelper( 10, 10 );
    gridHelper.position.y = -1.2;
    viewer.context.getScene().add( gridHelper );

    const axesHelper = new AxesHelper( 1 );
    axesHelper.position.y = -1.2;
    viewer.context.getScene().add( axesHelper );

    new RGBELoader()
					.setPath( 'textures/equirectangular/' )
					.load( 'abandoned_greenhouse_1k.hdr', function ( texture ) {

						texture.mapping = EquirectangularReflectionMapping;
						viewer.context.getScene().environment = texture;

						const loader = new GLTFLoader().setPath( 'models/' );
						loader.load( 'Pavillon La Hire.glb', function ( gltf ) {
                            const gltfModel = gltf.scene;
                            gltf.scene.position.x = 0.35;
                            gltf.scene.position.y = -1.18;
                            gltf.scene.position.z = -0.32;
							viewer.context.getScene().add( gltfModel );
                            viewer.context.getScene().traverse(function(child){
                                if (child.name === 'Pav_LaHire_RC_Model_1Mf_1' || child.name === 'Pav_LaHire_RC_Model_1Mf_2' ) {
                                    child.visible = false;
                                }
                            });
						} );
					} );

    function photomeshButtonActive () {

        photomeshButton.classList.add('active-button');

        viewer.context.getScene().traverse(function(child){
            if (child.name === 'Pav_LaHire_RC_Model_1Mf_1' || child.name === 'Pav_LaHire_RC_Model_1Mf_2' ) {
                child.visible = true;
            }
        });
        viewer.context.getScene().traverse(function(child){
            if (child.type === 'Mesh' && child.name !== 'Pav_LaHire_RC_Model_1Mf_1' && child.name !== 'Pav_LaHire_RC_Model_1Mf_2' ) {
                child.visible = false;
            }
        });
        viewer.context.getScene().traverse(function(child){
            if (child.type === 'AmbientLight' || child.type === 'DirectionalLight') {
                child.visible = false;
            }
        });

        viewer.context.getRenderer().toneMapping = ACESFilmicToneMapping;
        viewer.context.getRenderer().toneMappingExposure = 1;
        viewer.context.getRenderer().outputEncoding = sRGBEncoding;
    };

    function photomeshButtonDisable () {

        photomeshButton.classList.remove('active-button');

        viewer.context.getScene().traverse(function(child){
            if (child.name === 'Pav_LaHire_RC_Model_1Mf_1' || child.name === 'Pav_LaHire_RC_Model_1Mf_2' ) {
                child.visible = false;
            }
        });
        viewer.context.getScene().traverse(function(child){
            if (child.type === 'Mesh' && child.name !== 'Pav_LaHire_RC_Model_1Mf_1' && child.name !== 'Pav_LaHire_RC_Model_1Mf_2' ) {
                child.visible = true;
            }
        });
        viewer.context.getScene().traverse(function(child){
            if (child.type === 'AmbientLight' || child.type === 'DirectionalLight') {
                child.visible = true;
            }
        });

        viewer.context.getRenderer().toneMapping = 0;
        viewer.context.getRenderer().toneMappingExposure = 1;
        viewer.context.getRenderer().outputEncoding = 3000;
    }

    // PREVENT CLIPPER BUTTON WHEN PHOTOMESH 
    function preventOtherButtons(){
        clipperButton.classList.add('prevent-button');
        clipperButton.disabled = true;
    }
    function allowOtherButtons(){
        clipperButton.classList.remove('prevent-button');
        clipperButton.disabled = false;
    }

    let photomeshButtonBoolean = false;
    photomeshButton.onclick = () => {
        photomeshButtonBoolean = !photomeshButtonBoolean;
        if (photomeshButtonBoolean) {
            escAllButtons ();
            photomeshButtonActive ();
            preventOtherButtons();
        } else {
            photomeshButtonDisable();
            allowOtherButtons();
        };
    };                    
};
