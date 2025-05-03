import * as THREE from "three";

// Simple seeded random number generator
class MathRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

export function createBarriers(scene) {
  // Empty function - no barriers will be created
}

export function createTrees(scene) {
  // Use a deterministic random number generator for consistent tree placement
  const treeSeed = 54321; // Different seed than barriers
  let rng = new MathRandom(treeSeed);
  
  // Tree trunk materials (varying browns)
  const trunkMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0x6B4423, roughness: 0.9, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8, metalness: 0.1 })
  ];
  
  // Tree leaves materials (varying greens)
  const leavesMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: 0.8, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.7, metalness: 0.0 })
  ];
  
  // Create different types of trees
  for (let i = 0; i < 30; i++) {  
    // Select random materials
    const trunkMaterial = trunkMaterials[Math.floor(rng.random() * trunkMaterials.length)];
    const leavesMaterial = leavesMaterials[Math.floor(rng.random() * leavesMaterials.length)];
    
    // Create tree group
    const tree = new THREE.Group();
    
    // Create tree trunk
    const trunkHeight = 5 + rng.random() * 7;
    const trunkRadius = 0.3 + rng.random() * 0.3;
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius * 1.2, trunkHeight, 8);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);
    
    // Determine tree type (pine or broad-leaf)
    const isPine = rng.random() > 0.5;
    
    if (isPine) {
      // Pine tree (multiple cones stacked)
      const layers = 2 + Math.floor(rng.random() * 3);
      const baseRadius = trunkRadius * 6;
      const layerHeight = trunkHeight * 0.4;
      
      for (let j = 0; j < layers; j++) {
        const layerRadius = baseRadius * (1 - j * 0.2);
        const coneGeometry = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
        const cone = new THREE.Mesh(coneGeometry, leavesMaterial);
        cone.position.y = trunkHeight * 0.5 + j * (layerHeight * 0.6);
        cone.castShadow = true;
        cone.receiveShadow = true;
        tree.add(cone);
      }
    } else {
      // Broad-leaf tree (ellipsoidQuestion of and also a sphere
      const leafShape = rng.random() > 0.5 ? 'ellipsoid' : 'sphere';
      const leavesRadius = trunkRadius * (4 + rng.random() * 2);
      
      if (leafShape === 'ellipsoid') {
        // Create ellipsoid using scaled sphere
        const leavesGeometry = new THREE.SphereGeometry(leavesRadius, 8, 8);
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = trunkHeight * 0.7;
        leaves.scale.set(1, 1.2 + rng.random() * 0.5, 1);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        tree.add(leaves);
      } else {
        // Create multiple spheres for a more natural canopy
        const sphereCount = 2 + Math.floor(rng.random() * 3);
        for (let j = 0; j < sphereCount; j++) {
          const sphereSize = leavesRadius * (0.7 + rng.random() * 0.5);
          const leavesGeometry = new THREE.SphereGeometry(sphereSize, 8, 8);
          const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
          leaves.position.y = trunkHeight * 0.7;
          leaves.position.x = (rng.random() - 0.5) * trunkRadius * 2;
          leaves.position.z = (rng.random() - 0.5) * trunkRadius * 2;
          leaves.castShadow = true;
          leaves.receiveShadow = true;
          tree.add(leaves);
        }
      }
    }
    
    // Random position, avoiding center area and existing barriers
    const angle = rng.random() * Math.PI * 2;
    const distance = 15 + rng.random() * 40;  
    tree.position.x = Math.cos(angle) * distance;
    tree.position.z = Math.sin(angle) * distance;
    
    // Add some random rotation and scale variation
    tree.rotation.y = rng.random() * Math.PI * 2;
    const treeScale = 0.8 + rng.random() * 0.5;
    tree.scale.set(treeScale, treeScale, treeScale);
    
    // Add custom property for collision detection - move barrier detection to the whole tree instead
    tree.userData.isTree = true;
    tree.userData.isBarrier = true;
    
    scene.add(tree);
  }
}

export function createClouds(scene) {
  const cloudSeed = 67890; // Different seed for clouds
  let rng = new MathRandom(cloudSeed);
  
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Pure white
    opacity: 0.95, // Slightly increased opacity
    transparent: true,
    roughness: 0.9, // Increased roughness to make it less shiny
    metalness: 0.0,
    emissive: 0xcccccc, // Add slight emissive color to make it brighter
    emissiveIntensity: 0.2 // Subtle emission to enhance whiteness
  });
  
  for (let i = 0; i < 20; i++) {
    const cloudGroup = new THREE.Group();
    
    // Create cloud with multiple spheres
    const puffCount = 3 + Math.floor(rng.random() * 5);
    for (let j = 0; j < puffCount; j++) {
      const puffSize = 2 + rng.random() * 3;
      const puffGeometry = new THREE.SphereGeometry(puffSize, 7, 7);
      const puff = new THREE.Mesh(puffGeometry, cloudMaterial);
      
      puff.position.x = (rng.random() - 0.5) * 5;
      puff.position.y = (rng.random() - 0.5) * 2;
      puff.position.z = (rng.random() - 0.5) * 5;
      
      cloudGroup.add(puff);
    }
    
    // Position the cloud
    const angle = rng.random() * Math.PI * 2;
    const distance = 20 + rng.random() * 60;
    cloudGroup.position.x = Math.cos(angle) * distance;
    cloudGroup.position.z = Math.sin(angle) * distance;
    cloudGroup.position.y = 20 + rng.random() * 15;
    
    // Random rotation
    cloudGroup.rotation.y = rng.random() * Math.PI * 2;
    
    // Add to scene
    scene.add(cloudGroup);
  }
}

// Add function to create donation booths around the map
export function createDonationBooths(scene) {
  // Use a deterministic random number generator for consistent booth placement
  const boothSeed = 87654;
  let rng = new MathRandom(boothSeed);
  
  // Create booths in an oval/circle formation
  const boothCount = 15;
  const radius = 25; // Larger radius for a bigger circle
  const radiusVariation = 3; // Small variation to make it slightly oval
  
  for (let i = 0; i < boothCount; i++) {
    const booth = createEmptyBooth();
    
    // Position booths in an oval/circle around the center
    const angle = (i / boothCount) * Math.PI * 2;
    const adjustedRadius = radius + Math.sin(angle) * radiusVariation;
    
    booth.position.set(
      Math.cos(angle) * adjustedRadius,
      0,
      Math.sin(angle) * adjustedRadius
    );
    
    // Make booth face toward center
    booth.rotation.y = angle + Math.PI;
    
    // Mark as an empty booth
    booth.userData.isEmptyBooth = true;
    booth.userData.boothId = `booth-${i}`;
    
    scene.add(booth);
  }
}

// Create an empty booth that can be claimed
function createEmptyBooth() {
  const boothGroup = new THREE.Group();
  
  // Table surface
  const tableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
  const tableMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.8,
    metalness: 0.2
  });
  const table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.y = 0.8;
  table.castShadow = true;
  table.receiveShadow = true;
  boothGroup.add(table);
  
  // Table legs
  const legGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
  const legMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x6B4423,
    roughness: 0.8,
    metalness: 0.2
  });
  
  const positions = [
    [-0.9, 0.4, -0.4],
    [-0.9, 0.4, 0.4],
    [0.9, 0.4, -0.4],
    [0.9, 0.4, 0.4]
  ];
  
  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    leg.receiveShadow = true;
    boothGroup.add(leg);
  });
  
  // Sign on the booth
  const signGeometry = new THREE.BoxGeometry(1.6, 0.8, 0.05);
  const signMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFFFFF,
    roughness: 0.6,
    metalness: 0.1
  });
  const sign = new THREE.Mesh(signGeometry, signMaterial);
  sign.position.set(0, 1.5, 0);
  sign.castShadow = true;
  sign.receiveShadow = true;
  boothGroup.add(sign);
  
  // Sign support
  const supportGeometry = new THREE.BoxGeometry(0.1, 0.7, 0.1);
  const supportMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x6B4423,
    roughness: 0.8,
    metalness: 0.2
  });
  const support = new THREE.Mesh(supportGeometry, supportMaterial);
  support.position.set(0, 1.15, 0);
  support.castShadow = true;
  support.receiveShadow = true;
  boothGroup.add(support);
  
  // Create text for unclaimed sign
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  
  // Draw background
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  context.font = 'bold 28px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#000000';
  context.fillText('UNCLAIMED BOOTH', canvas.width / 2, canvas.height / 2);
  
  // Apply canvas to texture
  const texture = new THREE.CanvasTexture(canvas);
  const textMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide
  });
  
  // Create a plane for the text
  const textGeometry = new THREE.PlaneGeometry(1.5, 0.75);
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(0, 1.5, 0.03);
  textMesh.castShadow = false;
  textMesh.receiveShadow = false;
  textMesh.name = "boothText";
  boothGroup.add(textMesh);
  
  // Create claim button
  const claimButtonCanvas = document.createElement('canvas');
  claimButtonCanvas.width = 256;
  claimButtonCanvas.height = 64;
  const claimContext = claimButtonCanvas.getContext('2d');
  
  // Draw claim button
  claimContext.fillStyle = '#4CAF50';
  claimContext.fillRect(0, 0, claimButtonCanvas.width, claimButtonCanvas.height);
  claimContext.font = 'bold 24px Arial';
  claimContext.textAlign = 'center';
  claimContext.textBaseline = 'middle';
  claimContext.fillStyle = '#FFFFFF';
  claimContext.fillText('CLAIM BOOTH', claimButtonCanvas.width / 2, claimButtonCanvas.height / 2);
  
  const claimTexture = new THREE.CanvasTexture(claimButtonCanvas);
  const claimButtonMaterial = new THREE.MeshBasicMaterial({
    map: claimTexture,
    side: THREE.DoubleSide
  });
  
  const claimButtonGeometry = new THREE.PlaneGeometry(1, 0.3);
  const claimButtonMesh = new THREE.Mesh(claimButtonGeometry, claimButtonMaterial);
  claimButtonMesh.position.set(0, 0.86, 0.51);
  claimButtonMesh.rotation.x = -Math.PI / 4;
  claimButtonMesh.userData.isClaimButton = true;
  claimButtonMesh.name = "claimButton";
  boothGroup.add(claimButtonMesh);
  
  return boothGroup;
}