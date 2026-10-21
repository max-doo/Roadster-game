import { faultline } from './faultline';

export const level08=faultline({
  id:8,scenery:'windfarm',name:'CROSSWIND',subtitle:'侧风高原',theme:'canyon',lighting:'day',
  description:'借顺风蓄速，在逆风前调整节奏，利用上升气流接近高处落点。',
  tutorial:{action:'brake',text:'箭头提示风向。顺风借力跨越缺口，逆风前预留速度；风向切换时先控制车速。'},
  stages:[
    {name:'山脊加速',length:240,kind:'wind',star:true},
    {name:'逆风爬坡',length:260,kind:'ascent',rise:82},
    {name:'上升气流台',length:280,kind:'wind',star:true,rise:6},
    {name:'阵风门',length:240,kind:'gust'},
    {name:'风机线',length:280,kind:'wind',star:true},
    {name:'风暴盆地',length:210,kind:'bowl',star:true},
    {name:'终点爬升',length:200,kind:'wind',rise:6},
  ],
});
