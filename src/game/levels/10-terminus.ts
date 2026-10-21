import { faultline } from './faultline';

export const level10=faultline({
  id:10,scenery:'terminus',name:'TERMINUS',subtitle:'终局协议',theme:'canyon',lighting:'dusk',
  description:'以新的顺序串联坍塌、吸附、移动平台、风区与精确落点，完成中央发射链路。',
  tutorial:{action:'accelerate',text:'终局按新的顺序组合坍塌、倒置、平台和风区。每段入口都有固定补给点，失误后从检查点继续。'},
  stages:[
    {name:'余震入口',length:260,kind:'collapse',star:true},
    {name:'天花板链路',length:260,kind:'loop',star:true},
    {name:'货运中继',length:260,kind:'relay'},
    {name:'上行增压坡',length:280,kind:'ascent',rise:88},
    {name:'断桥回廊',length:260,kind:'gap'},
    {name:'风廊',length:280,kind:'wind',star:true,rise:6},
    {name:'上行链路',length:260,kind:'lift',star:true},
    {name:'最终发射脊柱',length:220,kind:'stairs'},
  ],
});
