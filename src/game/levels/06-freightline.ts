import { faultline } from './faultline';

export const level06=faultline({
  id:6,scenery:'harbor',name:'FREIGHTLINE',subtitle:'货运脉冲',theme:'lab',lighting:'night',
  description:'观察停靠窗口，制动随行，在集装箱、渡船和升降货台之间连续换乘。',
  tutorial:{action:'brake',text:'观察平台停靠再驶入，在平台中部制动随行，到达对岸后加速离开。'},
  stages:[
    {name:'港口调度场',length:220,kind:'rollers'},
    {name:'横移集装箱',length:180,kind:'ferry',star:true},
    {name:'移动码头',length:180,kind:'ferry'},
    {name:'升降货台',length:180,kind:'lift',star:true},
    {name:'双箱接力',length:220,kind:'relay',star:true},
    {name:'堆场窄道',length:200,kind:'gate',star:true},
    {name:'出港终点',length:160,kind:'gap'},
  ],
});
