import {writeFile,mkdir} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createVehicle} from '../src/render/vehicle';
// GLTFExporter uses the browser FileReader API to finalize a binary Blob.
class BlobReader {
  result:ArrayBuffer|string|null=null;
  onloadend:(()=>void)|null=null;
  readAsArrayBuffer(blob:Blob){void blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();});}
  readAsDataURL(blob:Blob){void blob.arrayBuffer().then(data=>{this.result=`data:${blob.type};base64,${Buffer.from(data).toString('base64')}`;this.onloadend?.();});}
}
Object.assign(globalThis,{FileReader:BlobReader});
const rig=createVehicle();const exporter=new GLTFExporter();const output=await exporter.parseAsync(rig.group,{binary:true,onlyVisible:true});
await mkdir('assets',{recursive:true});await writeFile('assets/roadster-2026.glb',Buffer.from(output as ArrayBuffer));
let triangles=0,meshes=0;rig.group.traverse(o=>{if('isMesh' in o){const m=o as import('three').Mesh;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;meshes++;}});rig.dispose();console.log(JSON.stringify({file:'assets/roadster-2026.glb',bytes:(output as ArrayBuffer).byteLength,meshes,triangles}));
