import { faultline } from './faultline';

export const level04=faultline({
  id:4,revision:3,scenery:'coast',name:'AFTERSHOCK',subtitle:'余震海岸',theme:'desert',lighting:'dusk',
  description:'穿越坍塌高架，等待错相升降桥板，在高位接驳后用喷气跨越长断口。',
  tutorial:{action:'accelerate',text:'坍塌板上保持前进；到错层震荡桥先制动，桥板低位驶入、高位驶离。长断口需要喷气，不能只保持全油门。'},
  stages:[
    {name:'滨海陡坡',length:260,kind:'ascent',rise:80},
    {name:'断裂场',length:200,kind:'collapse',collapseDelay:.9,star:true},
    {name:'服务飞跨',length:220,kind:'gap',gap:28,star:true},
    {name:'错层震荡桥',length:220,kind:'heave',star:true},
    {name:'坍塌回廊',length:200,kind:'collapse',collapseDelay:.75},
    {name:'风暴栈桥',length:180,kind:'gust',star:true},
    {name:'终点长跳',length:160,kind:'gap',gap:36},
  ],
});
