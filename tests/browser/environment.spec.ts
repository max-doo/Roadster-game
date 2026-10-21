import {test,expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';

test('the batched clearance panel follows the collision clock while guide hardware stays fixed',async({page})=>{
  await page.goto('/');
  await page.waitForFunction(()=>(window as any).__ROADSTER__);
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js' as string);
    const {createRoadObjects}=await import('/src/render/roadObjects.ts' as string);
    const {LEVELS}=await import('/src/game/levels/index.ts' as string);
    const {motionAt}=await import('/src/game/motion.ts' as string);
    const level=LEVELS[1],index=level.hazards.findIndex((h:any)=>h.kind==='gate'),hazard=level.hazards[index];
    const rig=createRoadObjects(level);
    const panel=rig.group.getObjectByName(`road-gate-${index}`),guides=rig.group.getObjectByName('fixed-road-hardware');
    try{
      const fixed=new THREE.Box3().setFromObject(guides).clone();
      const samples=[0,1.5,3.75,5].map(time=>{
        rig.update(time);
        const expected=motionAt(hazard.motion,time),bounds=new THREE.Box3().setFromObject(panel),center=bounds.getCenter(new THREE.Vector3());
        return {time,visible:panel.visible,meshes:panel.children.filter((o:any)=>o.isMesh).length,y:center.y,expected:hazard.y+expected.y,width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y,guideDrift:new THREE.Box3().setFromObject(guides).min.distanceTo(fixed.min)};
      });
      return {samples,width:hazard.w,height:hazard.h};
    }finally{rig.dispose();}
  });
  expect(Math.max(...result.samples.map(s=>s.y))-Math.min(...result.samples.map(s=>s.y))).toBeGreaterThan(5);
  for(const sample of result.samples){
    expect(sample.visible).toBe(true);expect(sample.meshes).toBeGreaterThan(0);expect(sample.meshes).toBeLessThan(10);
    expect(sample.y).toBeCloseTo(sample.expected,4);expect(sample.width).toBeCloseTo(result.width,4);expect(sample.height).toBeCloseTo(result.height,4);expect(sample.guideDrift).toBe(0);
  }
});

test('all ten scenery kits render with grounded roadside dressing', async ({page}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  await page.goto('/');await page.waitForFunction(() => (window as any).__ROADSTER__);
  await page.evaluate(async () => {
    const {GameRenderer} = await import('/src/render/engine.ts' as string);
    const host = document.createElement('div');host.id = 'placement-review';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#111';document.body.appendChild(host);
    (window as any).__PLACEMENT_REVIEW__ = new GameRenderer(host);
  });
  const dir = 'artifacts/scenery-placement';await mkdir(dir, {recursive: true});
  const reports = [];
  try {
    for (let id = 1; id <= 10; id++) {
      const report = await page.evaluate(async id => {
        const {LEVELS} = await import('/src/game/levels/index.ts' as string);
        const level = LEVELS[id - 1], rig = (window as any).__PLACEMENT_REVIEW__;
        rig.setLevel(level);rig.setQuality('high');
        const track = level.tracks.find((t: any) => !t.optional && !t.motion && !t.kind && !t.suction);
        const a = track.points[0], b = track.points[1];
        const x = id === 1 ? 90 : (a.x + b.x) / 2, y = id === 1 ? -4 : (a.y + b.y) / 2, z = a.z ?? 0;
        rig.car.group.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + .86, z);
        rig.camera.position.set(x - 8, y + 22, z + 115);rig.camera.lookAt(x, y - 4, z - 25);
        rig.sun.position.set(x - 10, y + 40, z + 25);rig.sun.target.position.set(x, y, z - 20);
        rig.scene.getObjectByName('sky')?.position.copy(rig.camera.position);
        rig.environment.update(0, x);
        let instances = 0, invalid = 0;
        rig.environment.group.traverse((o: any) => {
          if (o.isInstancedMesh) {instances += o.count;for (const n of o.instanceMatrix.array) if (!Number.isFinite(n)) invalid++;}
        });
        rig.renderer.render(rig.scene, rig.camera);
        return {id, instances, invalid, x, y};
      }, id);
      await page.waitForTimeout(350);
      await page.evaluate(() => {const rig = (window as any).__PLACEMENT_REVIEW__;rig.renderer.render(rig.scene, rig.camera);});
      await page.locator('#placement-review').screenshot({path: `${dir}/level-${id}.png`});
      expect(report.invalid, `level ${id}`).toBe(0);expect(report.instances).toBeGreaterThan(0);reports.push(report);
    }
    // Match the user's close view of the first bridge and its railing joints.
    await page.evaluate(async () => {
      const {LEVELS} = await import('/src/game/levels/index.ts' as string), rig = (window as any).__PLACEMENT_REVIEW__;
      rig.setLevel(LEVELS[0]);rig.car.group.position.set(4, .86, 0);
      rig.camera.position.set(7, 7, 23);rig.camera.lookAt(6, -.8, -2);
      rig.sun.position.set(-6, 30, 25);rig.sun.target.position.set(6, 0, 0);rig.environment.update(0, 6);
      rig.renderer.render(rig.scene, rig.camera);
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => {const rig = (window as any).__PLACEMENT_REVIEW__;rig.renderer.render(rig.scene, rig.camera);});
    await page.locator('#placement-review').screenshot({path: `${dir}/bridge-close.png`});
    // Night/tunnel acceptance uses the gameplay camera inside the gallery.
    for (const id of [6, 7]) {
      await page.evaluate(async id => {
        const {LEVELS} = await import('/src/game/levels/index.ts' as string), rig = (window as any).__PLACEMENT_REVIEW__;
        const api = (window as any).__ROADSTER__;api.start(id);api.manual(true);
        const state = api.snapshot();rig.setLevel(LEVELS[id - 1]);
        for (let i = 0; i < 8; i++) rig.render(state, .05, 0, true);
      }, id);
      await page.locator('#placement-review').screenshot({path: `${dir}/night-gameplay-${id}.png`});
    }
    await page.setViewportSize({width:844, height:390});
    await page.evaluate(async () => {
      const {LEVELS} = await import('/src/game/levels/index.ts' as string), rig = (window as any).__PLACEMENT_REVIEW__;
      const api = (window as any).__ROADSTER__;api.start(1);api.manual(true);
      rig.setLevel(LEVELS[0]);rig.render(api.snapshot(), .05, 0, true);
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {const rig = (window as any).__PLACEMENT_REVIEW__;rig.renderer.render(rig.scene, rig.camera);});
    await page.locator('#placement-review').screenshot({path: `${dir}/bridge-844.png`});
    await writeFile(`${dir}/render-report.json`, JSON.stringify({reports, errors}, null, 2));
    expect(errors).toEqual([]);
  } finally {
    await page.evaluate(() => {(window as any).__PLACEMENT_REVIEW__.dispose();document.querySelector('#placement-review')?.remove();});
  }
});

test('the first truck fallback rests on its grade within the existing 25 mm contact tolerance',async({page})=>{
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js' as string);
    const {createRoadObjects}=await import('/src/render/roadObjects.ts' as string);
    const {LEVELS}=await import('/src/game/levels/index.ts' as string);
    const rig=createRoadObjects(LEVELS[0]);
    try{
      const actor=rig.group.getObjectByName('road-car-0'),hazard=LEVELS[0].hazards[0],bounds=new THREE.Box3().setFromObject(actor);
      const tyres:any[]=[];actor.traverse((o:any)=>{if(o.isMesh&&o.material.color?.getHex()===0x111417)tyres.push(o);});
      const point=new THREE.Vector3();let contact=Infinity,penetration=0;
      for(const tyre of tyres){
        const p=tyre.geometry.getAttribute('position');tyre.updateWorldMatrix(true,false);
        for(let i=0;i<p.count;i++){
          point.fromBufferAttribute(p,i).applyMatrix4(tyre.matrixWorld);
          const road=(point.x-22)*1.5/12,clearance=point.y-road;
          contact=Math.min(contact,clearance);penetration=Math.max(penetration,-clearance);
        }
      }
      return {tyres:tyres.length,top:bounds.max.y,collisionTop:hazard.y+hazard.h/2,contact,penetration};
    }finally{rig.dispose();}
  });
  await mkdir('artifacts/scenery-placement', {recursive:true});
  await writeFile('artifacts/scenery-placement/truck-contact.json', JSON.stringify(result, null, 2));
  expect(result.tyres).toBeGreaterThan(0);expect(Math.abs(result.top-result.collisionTop)).toBeLessThan(.025);
  expect(result.penetration).toBeLessThan(.025);expect(Math.abs(result.contact)).toBeLessThan(.025);
});
