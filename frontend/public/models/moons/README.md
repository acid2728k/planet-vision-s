# 3D Models for Saturn's Moons

This directory should contain GLB models for Saturn's moons:

- `hyperion.glb` - Hyperion 3D model
- `epimetheus.glb` - Epimetheus 3D model  
- `telesto.glb` - Telesto 3D model
- `phoebe.glb` - Phoebe 3D model

## How to get the models:

1. **Hyperion**: Download from NASA Science "Hyperion 3D Model" (glTF format)
   - Convert to GLB if needed using Blender or online converter

2. **Epimetheus, Telesto, Phoebe**: Download from 3d-asteroids.space
   - Download OBJ or PLY format
   - Convert to GLB using Blender:
     - Open OBJ/PLY in Blender
     - Optional: Decimate mesh to ~2k-20k triangles for performance
     - Export as GLB (glTF Binary)

## Model Requirements:

- Format: GLB (glTF Binary)
- Triangle count: ~2k-20k (optimized for web)
- Scale: Models will be auto-scaled to match planet radius
- Material: Will be replaced with MeshStandardMaterial in code

## Fallback:

If models are not found, the application will use procedural geometry as fallback:
- Hyperion: Irregular octahedron shape
- Epimetheus: Ellipsoid (egg-shaped)
- Telesto/Phoebe: Sphere

