import { faultline } from './faultline';

export const level05=faultline({
  id:5,scenery:'tower',name:'VERTIGO',subtitle:'垂直试炼',theme:'canyon',lighting:'day',
  description:'持续吸附通过墙面与天花板，搭乘升降托架，再跨越高空塔桥。',
  tutorial:{action:'suction',text:'进入青色轨道前按住吸附。天花板尽头松开吸附，用姿态控制转正后落到下层接收台。'},
  stages:[
    {name:'塔基攀升',length:260,kind:'ascent',rise:84,width:4.5},
    {name:'墙面爬升',length:210,kind:'loop',star:true,width:4.5},
    {name:'天花板换乘',length:280,kind:'ceiling',width:4.5},
    {name:'检修接收台',length:175,kind:'bowl',width:4.5},
    {name:'升降吸附托架',length:160,kind:'lift',star:true,width:4.5},
    {name:'针脊爬升',length:180,kind:'stairs',star:true,width:4.5},
    {name:'塔桥悬臂',length:170,kind:'gap',star:true,width:4.5},
    {name:'云顶终点',length:75,kind:'road',width:4.5},
  ],
});
