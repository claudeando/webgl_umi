import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'

import * as dat from 'dat.gui'
import random from 'canvas-sketch-util/random'


const canvas = document.createElement('canvas')
canvas.width = 650
canvas.height = 650

window.addEventListener('load', init)

function init() {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100)
  camera.position.z = 5

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvas.width, canvas.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  document.body.append(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.autoRotate = true
  controls.enableDamping = true
  controls.dampingFactor = 0.125
  controls.update()

  const gui = new dat.GUI({ width: 350 })


  // basic mesh
  // const mesh = new THREE.Mesh(
  //   new THREE.BoxGeometry(1, 1, 1, 16, 16, 16),
  //   new THREE.MeshNormalMaterial({
  //     wireframe: true
  //   })
  // )
  // scene.add(mesh)



  // shaderPass
  // const effectComposer = new EffectComposer(renderer)
  // effectComposer.setSize(canvas.width, canvas.height)
  // effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  // const renderPass = new RenderPass()
  // const MyPass = {
  //   uniforms: {
  //     uAlpha: { value: 0.5 }
  //   },
  //   vertexShader: `
  //   void main() {
  // vec4 modelPos = modelMatrix * vec4(position, 1.0);
  // vec4 viewPos = viewMatrix * modelPos;
  // vec4 projectionPos = projectionMatrix * viewPos;
  // gl_Position = projectionPos;
  //   }`,
  //   fragmentShader: `
  //   uniform float uAlpha;

  //   void main() {
  //     gl_FragColor = vec4(1.0, 0.0, 0.0, uAlpha);
  //   }`
  // }
  // const shaderPass = new ShaderPass(MyPass)
  // effectComposer.addPass(shaderPass)


  // custom shader
  const shaderGeo = new THREE.PlaneGeometry(2.5, 2.5, 512 * 2, 512 * 2)
  const count = shaderGeo.attributes.position.count
  const random = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    random[i] = Math.random()
  }
  shaderGeo.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))

  const debugObject = {}
  debugObject.depthColor = '#186691'
  debugObject.surfaceColor = '#9bd8ff'

  gui.addColor(debugObject, 'depthColor').onChange(() => { shaderMat.uniforms.uDepthColor.value.set(debugObject.depthColor) })
  gui.addColor(debugObject, 'surfaceColor').onChange(() => { shaderMat.uniforms.uSurfaceColor.value.set(debugObject.surfaceColor) })

  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFrequency: { value: new THREE.Vector2(4, 1.5) },
      uElevation: { value: 0.2 },
      uVelocity: { value: 0.75 },
      uSmallWavesElevation: { value: 0.15 },
      uSmallWavesFrequency: { value: 3 },
      uSmallWavesSpeed: { value: 0.2 },
      uSmallIterations: { value: 4 },

      uDepthColor: { value: new THREE.Color(debugObject.depthColor) },
      uSurfaceColor: { value: new THREE.Color(debugObject.surfaceColor) },
      uColorOffset: { value: 0.08 },
      uColorMultiplier: { value: 5 }
    },
    vertexShader: `
    attribute float aRandom;
    uniform float uTime;
    uniform vec2 uFrequency;
    uniform float uElevation;
    uniform float uVelocity;

    uniform float uSmallWavesElevation;
    uniform float uSmallWavesFrequency;
    uniform float uSmallWavesSpeed;
    uniform float uSmallIterations;


    uniform float uColorOffset;
    uniform float uColorMultiplier;

    varying vec2 vUv;
    varying float vElevation;


    // Classic Perlin 3D Noise 
    // by Stefan Gustavson
    //
    vec4 permute(vec4 x)
    {
        return mod(((x*34.0)+1.0)*x, 289.0);
    }
    vec4 taylorInvSqrt(vec4 r)
    {
        return 1.79284291400159 - 0.85373472095314 * r;
    }
    vec3 fade(vec3 t)
    {
        return t*t*t*(t*(t*6.0-15.0)+10.0);
    }

    float cnoise(vec3 P)
    {
        vec3 Pi0 = floor(P); // Integer part for indexing
        vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P); // Fractional part for interpolation
        vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.yy, Pi1.yy);
        vec4 iz0 = Pi0.zzzz;
        vec4 iz1 = Pi1.zzzz;

        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);

        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);

        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);

        vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
        vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
        vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
        vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
        vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
        vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
        vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
        vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;

        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);

        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
        return 2.2 * n_xyz;
    }

    void main() {
      vec4 modelPos = modelMatrix * vec4(position, 1.0);
      float elevation = sin(modelPos.x * uFrequency.x + uTime * uVelocity) * 
                        sin(modelPos.z * uFrequency.y + uTime * uVelocity) * 
                        uElevation;


      for(float i = 1.0; i <= 3.0; i ++) {
        elevation -= abs(cnoise(vec3(modelPos.xz * 3.0 * i, uTime * 0.2)) * 0.15 / i);
        modelPos.y += elevation;
      }
     

      vec4 viewPos = viewMatrix * modelPos;
      vec4 projectionPos = projectionMatrix * viewPos;
      gl_Position = projectionPos;

      vUv = uv;
      vElevation = elevation;
    }`,
    fragmentShader: `
    uniform float uTime;

    uniform vec3 uDepthColor;
    uniform vec3 uSurfaceColor;
    uniform float uColorOffset;
    uniform float uColorMultiplier;
    
    varying float vElevation;
    varying vec2 vUv;

    void main() {
      float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
      vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);
      
      gl_FragColor = vec4(color, 1.0);
    }`,
    // wireframe: true
  })

  const shader = new THREE.Mesh(shaderGeo, shaderMat)
  shader.rotation.x = -Math.PI * 0.5
  scene.add(shader)

  gui.add(shaderMat.uniforms.uFrequency.value, 'x').min(0).max(25).step(0.001).name('frequencyX')
  gui.add(shaderMat.uniforms.uFrequency.value, 'y').min(0).max(25).step(0.001).name('frequencyY')
  gui.add(shaderMat.uniforms.uElevation, 'value').min(0).max(1).step(0.001).name('elevation')
  gui.add(shaderMat.uniforms.uVelocity, 'value').min(0).max(4).step(0.001).name('velocity')

  gui.add(shaderMat.uniforms.uColorOffset, 'value').min(0).max(4).step(0.001).name('colorOffset')
  gui.add(shaderMat.uniforms.uColorMultiplier, 'value').min(0).max(4).step(0.001).name('colorMultiplier')




  window.addEventListener('resize', () => {
    camera.aspect = canvas.width / canvas.height
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math, min(window.devicePixelRatio, 2))
    document.body.append(renderer.domElement)
    effectComposer.setSize(canvas.width, canvas.height)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  })


  const clock = new THREE.Clock()
  const animate = () => {
    const elapsedTime = clock.getElapsedTime()

    controls.update()

    shaderMat.uniforms.uTime.value = Math.sin(elapsedTime)

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
    // effectComposer.render()
  }
  animate()
}