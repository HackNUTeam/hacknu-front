import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader } from '@googlemaps/js-api-loader';


var data = getData()
var ind = 0;

const apiOptions = {
    "apiKey": "AIzaSyBHiUAtpqxTupKHUJTal9qfG_Z8DKvLPOQ",
    "version": "beta"
};

const mapOptions = {
    "tilt": 20,
    "heading": 0,
    "zoom": 17,
    "center": { lat: 33.8004048, lng: -118.3890381 },
    "mapId": "b498aa93b3c701a9"
}

async function initMap() {
    const mapDiv = document.getElementById("map");
    const apiLoader = new Loader(apiOptions);
    await apiLoader.load();
    return new google.maps.Map(mapDiv, mapOptions);
}

var selected = 0;
const cordPoints = [

];

async function initWebGLOverlayView(map) {
  
    let scene, renderer, camera, loader;
    const webGLOverlayView = new google.maps.WebGLOverlayView();

    webGLOverlayView.onAdd = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera();
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.75); // soft white light
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
      directionalLight.position.set(0.5, -1, 0.5);
      scene.add(directionalLight);

      loader = new GLTFLoader();

    }


    webGLOverlayView.onDraw = ({ gl, transformer }) => {

      for (let i = 0; i < cordPoints.length; i++) {
        const matrix = transformer.fromLatLngAltitude(cordPoints[i]);
        camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
        let material, geometry;

        if (i == selected) {
          geometry = new THREE.SphereGeometry( 10, 32, 32 );
          material = new THREE.MeshBasicMaterial({color: 'red', opacity: 0.5, transparent: true});
        } else {
          geometry = new THREE.SphereGeometry( 5, 32, 32 );
          material = new THREE.MeshBasicMaterial({color: 'lightblue', opacity: 0.5, transparent: true});
        }

        const sphere = new THREE.Mesh( geometry, material);
        scene.add(sphere);
        webGLOverlayView.requestRedraw();
        renderer.render(scene, camera);
        renderer.resetState();

      }


    }

    webGLOverlayView.onContextRestored = ({ gl }) => {
      renderer = new THREE.WebGLRenderer({
          canvas: gl.canvas,
          context: gl,
          ...gl.getContextAttributes(),
      });

      renderer.autoClear = false;

      loader.manager.onLoad = () => {
        
      }
    }
    webGLOverlayView.setMap(map);


  setInterval(myFunction, 2000)

  function myFunction() {
    cordPoints.push(data[ind])
    ind++
    renderer.resetState();
  }
}

(async() => {
    const map = await initMap();
    initWebGLOverlayView(map);
})();




///
/// API
///
function getData() {
  return [
      {
        lat: 33.8004048,
        lng: -118.3890381,
        altitude: 72.7999878
      },
      {
        lat: 33.8004048,
        lng: -118.3890381,
        altitude: 72.7999878
      },
      {
        lat: 33.8005925,
        lng: -118.3887513,
        altitude: 72.5999756
      },
      {
        lat: 33.800705,
        lng: -118.3885462,
        altitude: 72.2000122
      },
      {
        lat: 33.8008574,
        lng: -118.3881463,
        altitude: 72.7999878
      },
    ];
}
