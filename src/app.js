import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader } from '@googlemaps/js-api-loader';
const apiOptions = {
    "apiKey": "AIzaSyAtbzvL0S6HVXlBEKMFPE3ZEvx5CxRpHcQ",
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
async function initGeocoder() {
  const apiLoader = new Loader(apiOptions);
  await apiLoader.load();
  return new google.maps.Geocoder();
}

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
        const source = 'pin.gltf';
        loader.load(
            source,
            gltf => {
                gltf.scene.scale.set(5, 5, 5);
                gltf.scene.rotation.x = 180 * Math.PI / 180;
                scene.add(gltf.scene);
            }
        );
    }


    webGLOverlayView.onDraw = ({ gl, transformer }) => {
        const cordPoints = [
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


        for (let i = 0; i < cordPoints.length; i++) {
          const matrix = transformer.fromLatLngAltitude(cordPoints[i]);
          camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
          webGLOverlayView.requestRedraw();
          renderer.render(scene, camera);
          renderer.resetState();
        }


        const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        const points = [];
        points.push( new THREE.Vector3( - 10, 0, 0 ) );
        points.push( new THREE.Vector3( 0, 10, 0 ) );
        points.push( new THREE.Vector3( 10, 0, 0 ) );
        
        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        const line = new THREE.Line( geometry, material );
        scene.add( line );
        renderer.render( scene, camera );
        
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
}

(async() => {
    const map = await initMap();
    const geocoder = await initGeocoder(map)
    const infowindow = new google.maps.InfoWindow();
    geocodeLatLng(geocoder, map, infowindow);
    initWebGLOverlayView(map);
})();

function geocodeLatLng(
  geocoder,
  map,
  infowindow
) {
  const latlng = {
    lat: 33.8004048,
    lng: -118.3890381,
  };

  geocoder
    .geocode({ location: latlng})
    .then((response) => {
      if (response.results[0]) {
        map.setZoom(11);

        const marker = new google.maps.Marker({
          position: latlng,
          map: map,
        });
        document.getElementById("place").innerHTML = response.results[0].formatted_address;
        infowindow.setContent(response.results[0].formatted_address);
        infowindow.open(map, marker);
      } else {
        window.alert("No results found");
      }
    })
    .catch((e) => window.alert("Geocoder failed due to: " + e));
}