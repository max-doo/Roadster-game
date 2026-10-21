import { faultline } from './faultline';

export const level07=faultline({
  id:7,scenery:'tunnel',name:'BLACKOUT',subtitle:'无光隧道',theme:'lab',lighting:'blackout',
  description:'沿应急灯带读路，穿过无光吸附弧和检修口，控制低净空通行时机。',
  tutorial:{action:'accelerate',text:'沿应急边灯读路。车灯照到前方闸门后会启动开门，等待预警结束再通行。'},
  stages:[
    {name:'应急入口',length:140,kind:'road'},
    {name:'应急道闸',length:170,kind:'gate',star:true},
    {name:'无光倒置弧',length:230,kind:'loop',star:true},
    {name:'断电检修口',length:200,kind:'sweep'},
    {name:'上层检修支线',length:220,kind:'loop',star:true},
    {name:'出口坡',length:180,kind:'bowl',star:true},
  ],
});
