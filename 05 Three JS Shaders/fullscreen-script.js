// Fullscreen Three.js Scene - Shader Demonstrations
let fullscreenScene, fullscreenCamera, fullscreenRenderer, fullscreenControls;
let spheres = [];
let fullscreenContainer;
let animationId;

function initFullscreen() {
    // Create fullscreen container
    fullscreenContainer = document.createElement('div');
    fullscreenContainer.className = 'fullscreen-canvas';
    fullscreenContainer.style.display = 'none';
    document.body.appendChild(fullscreenContainer);

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'fullscreen-threejs-canvas';
    fullscreenContainer.appendChild(canvas);

    // Create back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = '← Back to Main';
    backButton.onclick = exitFullscreen;
    fullscreenContainer.appendChild(backButton);

    // Scene
    fullscreenScene = new THREE.Scene();
    fullscreenScene.background = new THREE.Color(0xd0d0d0); // Light grey background
    
    // Camera
    fullscreenCamera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1,
        1000
    );
    fullscreenCamera.position.set(5, 5, 5);
    
    // Renderer - Optimized settings
    fullscreenRenderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: false, // Disable for better performance
        powerPreference: "high-performance"
    });
    fullscreenRenderer.setSize(window.innerWidth, window.innerHeight);
    fullscreenRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    fullscreenRenderer.shadowMap.enabled = true;
    fullscreenRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Orbit Controls
    fullscreenControls = new THREE.OrbitControls(fullscreenCamera, fullscreenRenderer.domElement);
    fullscreenControls.enableDamping = true;
    fullscreenControls.dampingFactor = 0.1;
    fullscreenControls.enableZoom = true;
    fullscreenControls.enablePan = true;
    
    // Create three spheres with different shaders
    createThreeSpheres();
    
    // Add basic lighting
    addBasicLighting();
    
    // Start animation loop
    animateFullscreen();
    
    // Handle window resize
    window.addEventListener('resize', onFullscreenWindowResize);
}

function createThreeSpheres() {
    const sphereRadius = 1.0;
    const spacing = 4.0;
    
    // Define shader materials
    const flatColorMaterial = createFlatColorShader();
    const gradientMaterial = createGradientShader();
    const kernelMaterial = createKernelShader();
    
    // Create three spheres aligned horizontally
    const sphereConfigs = [
        {
            position: { x: -spacing, y: 0, z: 0 },
            material: flatColorMaterial,
            label: "Flat Color Shader"
        },
        {
            position: { x: 0, y: 0, z: 0 },
            material: gradientMaterial,
            label: "Gradient Shader"
        },
        {
            position: { x: spacing, y: 0, z: 0 },
            material: kernelMaterial,
            label: "Kernel Effect Shader"
        }
    ];
    
    sphereConfigs.forEach((config, index) => {
        // Create sphere geometry
        const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
        
        // Clone the material for this sphere
        const sphereMaterial = config.material.clone();
        
        // Set specific colors for each shader type
        if (index === 0) {
            // Flat color - bright red
            sphereMaterial.uniforms.uColor.value = new THREE.Color(0xff4444);
        } else if (index === 1) {
            // Gradient - blue to purple
            sphereMaterial.uniforms.uColor1.value = new THREE.Color(0x4444ff);
            sphereMaterial.uniforms.uColor2.value = new THREE.Color(0xff44ff);
        } else {
            // Kernel - bright green
            sphereMaterial.uniforms.uColor.value = new THREE.Color(0x44ff44);
        }
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(config.position.x, config.position.y, config.position.z);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        
        // Store sphere data
        const sphereData = {
            mesh: sphere,
            position: config.position,
            label: config.label,
            material: sphereMaterial,
            shaderType: config.label
        };
        
        spheres.push(sphereData);
        fullscreenScene.add(sphere);
    });
}


function addBasicLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    fullscreenScene.add(ambientLight);
    
    // Simple directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    fullscreenScene.add(directionalLight);
}

function animateFullscreen() {
    animationId = requestAnimationFrame(animateFullscreen);
    
    // Update controls
    fullscreenControls.update();
    
    // Update shader uniforms
    const time = performance.now() * 0.001;
    spheres.forEach(sphereData => {
        if (sphereData.material && sphereData.material.uniforms) {
            if (sphereData.material.uniforms.uTime) {
                sphereData.material.uniforms.uTime.value = time;
            }
        }
    });
    
    // Render
    fullscreenRenderer.render(fullscreenScene, fullscreenCamera);
}

function onFullscreenWindowResize() {
    fullscreenCamera.aspect = window.innerWidth / window.innerHeight;
    fullscreenCamera.updateProjectionMatrix();
    fullscreenRenderer.setSize(window.innerWidth, window.innerHeight);
}

function enterFullscreen() {
    if (!fullscreenContainer) {
        initFullscreen();
    }
    
    fullscreenContainer.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Focus the canvas for keyboard controls
    const canvas = document.getElementById('fullscreen-threejs-canvas');
    canvas.focus();
}

function exitFullscreen() {
    if (fullscreenContainer) {
        fullscreenContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Stop animation loop to save resources
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
}

function disposeFullscreenResources() {
    // Clean up Three.js resources
    if (fullscreenScene) {
        fullscreenScene.clear();
    }
    
    if (fullscreenRenderer) {
        fullscreenRenderer.dispose();
    }
    
    if (fullscreenControls) {
        fullscreenControls.dispose();
    }
    
    // Remove event listeners
    window.removeEventListener('resize', onFullscreenWindowResize);
}

// Shader creation functions
function createFlatColorShader() {
    const vertexShader = `
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 uColor;
        
        void main() {
            // Completely flat, unlit color
            gl_FragColor = vec4(uColor, 1.0);
        }
    `;
    
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0xff0000) }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });
}

function createGradientShader() {
    const vertexShader = `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
            // Create gradient based on UV coordinates and time
            float gradientFactor = sin(vUv.y * 3.14159 + uTime * 0.5) * 0.5 + 0.5;
            vec3 gradientColor = mix(uColor1, uColor2, gradientFactor);
            
            // Add some lighting
            vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
            float lightIntensity = max(dot(vNormal, lightDirection), 0.2);
            
            vec3 finalColor = gradientColor * lightIntensity;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;
    
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor1: { value: new THREE.Color(0xff0000) },
            uColor2: { value: new THREE.Color(0x0000ff) },
            uTime: { value: 0.0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });
}

function createKernelShader() {
    const vertexShader = `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        // Simple noise function
        float noise(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        // Fractal noise
        float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 0.0;
            
            for (int i = 0; i < 4; i++) {
                value += amplitude * noise(st);
                st *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }
        
        void main() {
            // Create kernel-like pattern using noise
            vec2 st = vUv * 8.0;
            float pattern = fbm(st + uTime * 0.5);
            
            // Create kernel effect
            float kernel = sin(pattern * 10.0) * 0.5 + 0.5;
            kernel = pow(kernel, 2.0);
            
            // Mix base color with kernel pattern
            vec3 kernelColor = uColor * (0.3 + kernel * 0.7);
            
            // Add some rim lighting
            vec3 viewDirection = normalize(cameraPosition - vPosition);
            float rim = 1.0 - max(dot(vNormal, viewDirection), 0.0);
            rim = pow(rim, 2.0);
            
            vec3 finalColor = kernelColor + rim * uColor * 0.5;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;
    
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0x00ff00) },
            uTime: { value: 0.0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });
}

// Initialize fullscreen functionality when the page loads
window.addEventListener('load', function() {
    // Add event listener to the fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', enterFullscreen);
    }
    
    // Add keyboard support for exiting fullscreen
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && fullscreenContainer && fullscreenContainer.style.display === 'block') {
            exitFullscreen();
        }
    });
});
