import { faultline } from './faultline';

export const level09=faultline({
  id:9,scenery:'anchor',name:'THE NEEDLE',subtitle:'天针',theme:'canyon',lighting:'dusk',
  description:'通过窄轨半环和落点窗口，逐级换轨后沿倒置回廊到达锚塔顶端。',
  tutorial:{action:'suction',text:'窄轨需要持续吸附。落井后调整姿态，固定换轨阶梯要先控制速度再选择上、下层落点。'},
  stages:[
    {name:'锚塔陡坡',length:260,kind:'ascent',rise:88,width:4.5},
    {name:'连续半环',length:220,kind:'loop',star:true,width:4.5},
    {name:'固定天花板换轨',length:240,kind:'railgap',star:true,width:4.5},
    {name:'落井接收台',length:160,kind:'drop',width:4.5},
    {name:'固定换轨阶梯',length:220,kind:'transfer',star:true,width:4.5},
    {name:'反向换轨回廊',length:300,kind:'switchback',star:true,width:4.5},
    {name:'顶点波浪坡',length:240,kind:'sweep',width:4.5},
  ],
});
