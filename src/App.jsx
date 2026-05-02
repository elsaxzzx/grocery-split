import { useState, useRef } from "react";

const PEOPLE = ["xyd", "zxb", "zxy"];
const COLORS = { xyd: "#F4A261", zxb: "#52B788", zxy: "#74B3CE" };
const LIGHT  = { xyd: "#FEF3E9", zxb: "#E8F5EE", zxy: "#E8F3F9" };

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

function parseFraction(str) {
  str = String(str).trim();
  if (!str) return 0;
  if (str.includes("/")) { const [a,b]=str.split("/").map(Number); return b?a/b:0; }
  return parseFloat(str)||0;
}
function fmt(n){ return "£"+Math.abs(n).toFixed(2); }
let _id=1; const uid=()=>_id++;
function newItem(){ return {id:uid(),name:"",price:0,discount:0,vat:"Z",splits:{xyd:0,zxb:0,zxy:0}}; }
function newExp() { return {id:uid(),name:"",amount:0,paidBy:"xyd"}; }

async function recogniseReceipt(base64, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model:"claude-haiku-4-5-20251001",
      max_tokens:2000,
      messages:[{
        role:"user",
        content:[
          { type:"image", source:{ type:"base64", media_type:mediaType, data:base64 } },
          { type:"text", text:`你是超市收据解析助手。请从这张Costco收据图片中提取所有商品，输出纯JSON数组，不要有任何其他文字或markdown代码块。

格式：
[{"name_zh":"中文名","name_en":"英文名","price":数字,"discount":折扣金额或0,"vat":"Z或A"}]

规则：
- price 是商品的原始标价（正数）
- 折扣识别：金额后带"-A"或"-Z"（如 1.00-A）的行是上一件商品的折扣，将其填入上一件商品的discount字段，不单独列出
- vat: 直接读取小票上该商品行末尾的字母，"A"填"A"，"Z"填"Z"
- 分割线（Bottom of Basket、BOB Count）不要列出
- 只输出JSON数组` }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const text = data.content?.find(b=>b.type==="text")?.text||"[]";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

function SplitRow({person,value,onChange,total}){
  const [raw,setRaw]=useState(String(value));
  const amt=parseFraction(raw);
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
      <div style={{width:40,height:26,borderRadius:6,background:COLORS[person],color:"#fff",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>
        {person}
      </div>
      <input value={raw}
        onChange={e=>{setRaw(e.target.value);onChange(parseFraction(e.target.value));}}
        placeholder="0 / 1/2 / 1/3"
        style={{width:80,padding:"4px 8px",border:"1.5px solid #E0E0E0",borderRadius:6,
          fontSize:12,fontFamily:"monospace",outline:"none",background:"#FAFAFA"}}/>
      {total>0&&amt>0&&<span style={{fontSize:11,color:"#888",minWidth:50}}>{fmt(amt*total)}</span>}
    </div>
  );
}

function ItemCard({item,index,onUpdate,onDelete}){
  const [open,setOpen]=useState(false);
  const totalSum=PEOPLE.reduce((s,p)=>s+(item.splits[p]||0),0);
  const isValid=Math.abs(totalSum-1)<0.01;
  const net=item.vat==="A"?(item.price-(item.discount||0))*1.2:(item.price-(item.discount||0));

  function quickAssign(p){ const s={}; PEOPLE.forEach(q=>s[q]=q===p?1:0); onUpdate({...item,splits:s}); }
  function thirds(){ const s={}; PEOPLE.forEach(p=>s[p]=1/3); onUpdate({...item,splits:s}); }

  return(
    <div style={{border:`1.5px solid ${isValid&&totalSum>0?"#D4EDDA":"#F5C6CB"}`,
      borderRadius:12,marginBottom:8,overflow:"hidden",background:"#fff",
      boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
      <div onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:10,
        padding:"9px 12px",cursor:"pointer",
        background:isValid&&totalSum>0?"#F8FFF9":"#FFF8F8"}}>
        <span style={{width:20,height:20,borderRadius:"50%",background:"#EFEFEF",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:10,color:"#888",flexShrink:0}}>{index+1}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {item.name||<span style={{color:"#BBB"}}>未命名</span>}
          </div>
          <div style={{display:"flex",gap:5,marginTop:2,flexWrap:"wrap"}}>
            {PEOPLE.map(p=>item.splits[p]>0&&(
              <span key={p} style={{background:LIGHT[p],color:COLORS[p],
                borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:600}}>
                {p} {fmt(item.splits[p]*net)}
              </span>
            ))}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:700}}>{fmt(net)}</div>
          {(item.discount||0)>0&&<div style={{fontSize:10,color:"#E74C3C",textDecoration:"line-through"}}>{fmt(item.vat==="A"?item.price*1.2:item.price)}</div>}
          <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,
            background:item.vat==="A"?"#FEF3E9":"#E8F5EE",
            color:item.vat==="A"?"#E67E22":"#27AE60",fontWeight:600}}>
            {item.vat==="A"?"+20% VAT":"零税率"}
          </span>
        </div>
        <span style={{fontSize:12,color:"#BBB"}}>{open?"▲":"▼"}</span>
      </div>

      {open&&(
        <div style={{padding:"12px 14px",borderTop:"1px solid #F0F0F0",background:"#FAFAFA"}}>
          <div style={{marginBottom:8}}>
            <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>商品名称</label>
            <input value={item.name} onChange={e=>onUpdate({...item,name:e.target.value})}
              placeholder="例：黑莓 / Blackberries 340g"
              style={{width:"100%",padding:"6px 10px",border:"1.5px solid #E0E0E0",
                borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:70}}>
              <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>原价 £</label>
              <input type="number" step="0.01" min="0" value={item.price}
                onChange={e=>onUpdate({...item,price:parseFloat(e.target.value)||0})}
                style={{width:"100%",padding:"6px 8px",border:"1.5px solid #E0E0E0",
                  borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1,minWidth:70}}>
              <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>折扣 £</label>
              <input type="number" step="0.01" min="0" value={item.discount||""} placeholder="0"
                onChange={e=>onUpdate({...item,discount:parseFloat(e.target.value)||0})}
                style={{width:"100%",padding:"6px 8px",border:"1.5px solid #E0E0E0",
                  borderRadius:8,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1,minWidth:100}}>
              <label style={{fontSize:11,color:"#888",display:"block",marginBottom:3}}>VAT</label>
              <div style={{display:"flex",gap:4}}>
                {["Z","A"].map(v=>(
                  <button key={v} onClick={()=>onUpdate({...item,vat:v})} style={{
                    flex:1,padding:"6px 0",border:"1.5px solid",
                    borderColor:item.vat===v?COLORS.xyd:"#E0E0E0",borderRadius:8,
                    fontSize:11,cursor:"pointer",
                    background:item.vat===v?LIGHT.xyd:"#fff",
                    color:item.vat===v?COLORS.xyd:"#888",
                    fontWeight:item.vat===v?700:400}}>
                    {v==="Z"?"Z 食品":"A +20%"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label style={{fontSize:11,color:"#888",display:"block",marginBottom:6}}>快速分配</label>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {PEOPLE.map(p=>(
              <button key={p} onClick={()=>quickAssign(p)} style={{
                padding:"4px 10px",borderRadius:6,border:"none",
                background:COLORS[p],color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                全→{p}
              </button>
            ))}
            <button onClick={thirds} style={{padding:"4px 10px",borderRadius:6,
              border:"1.5px solid #DDD",background:"#fff",color:"#555",fontSize:11,cursor:"pointer"}}>
              三等分
            </button>
          </div>
          <label style={{fontSize:11,color:"#888",display:"block",marginBottom:5}}>自定义比例</label>
          {PEOPLE.map(p=>(
            <SplitRow key={p} person={p} value={item.splits[p]||0} total={net}
              onChange={v=>onUpdate({...item,splits:{...item.splits,[p]:v}})}/>
          ))}
          {!isValid&&totalSum>0&&(
            <div style={{fontSize:11,color:"#E74C3C",marginTop:3}}>
              ⚠ 比例总和={totalSum.toFixed(3)}，应为1
            </div>
          )}
          <button onClick={onDelete} style={{marginTop:10,padding:"4px 12px",borderRadius:6,
            border:"1.5px solid #FFCCCC",background:"#FFF5F5",color:"#E74C3C",fontSize:11,cursor:"pointer"}}>
            删除
          </button>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [items,setItems]=useState([newItem()]);
  const [extras,setExtras]=useState([]);
  const [payer,setPayer]=useState("xyd");
  const [tab,setTab]=useState("scan");
  const [scanning,setScanning]=useState(false);
  const [scanMsg,setScanMsg]=useState("");
  const [previews,setPreviews]=useState([]);
  const [noKey,setNoKey]=useState(!API_KEY);
  const fileRef=useRef();

  const groceryTotals={};
  PEOPLE.forEach(p=>{
    groceryTotals[p]=items.reduce((s,item)=>{
      const net=item.vat==="A"?(item.price-(item.discount||0))*1.2:(item.price-(item.discount||0));
      return s+net*(item.splits[p]||0);
    },0);
  });
  const groceryTotal=Object.values(groceryTotals).reduce((a,b)=>a+b,0);
  const extraPerPerson=extras.reduce((s,e)=>s+e.amount,0)/3;
  const owes={}; PEOPLE.forEach(p=>{owes[p]=groceryTotals[p]+extraPerPerson;});
  const paid={xyd:0,zxb:0,zxy:0};
  paid[payer]+=groceryTotal;
  extras.forEach(e=>{paid[e.paidBy]=(paid[e.paidBy]||0)+e.amount;});
  const net={}; PEOPLE.forEach(p=>{net[p]=paid[p]-owes[p];});
  const transfers=[];
  const bal={...net};
  for(let i=0;i<10;i++){
    const debtors=PEOPLE.filter(p=>bal[p]<-0.005).sort((a,b)=>bal[a]-bal[b]);
    const creditors=PEOPLE.filter(p=>bal[p]>0.005).sort((a,b)=>bal[b]-bal[a]);
    if(!debtors.length||!creditors.length)break;
    const d=debtors[0],c=creditors[0];
    const amt=Math.min(-bal[d],bal[c]);
    transfers.push({from:d,to:c,amount:amt});
    bal[d]+=amt; bal[c]-=amt;
  }

  async function handleFiles(files){
    if(!files?.length)return;
    if(!API_KEY){ setNoKey(true); return; }
    setScanning(true); setScanMsg("正在识别小票…");
    const newPreviews=[];
    const allItems=[];
    for(const file of Array.from(files)){
      const mediaType=file.type||"image/jpeg";
      const b64=await new Promise((res,rej)=>{
        const r=new FileReader();
        r.onload=()=>res(r.result.split(",")[1]);
        r.onerror=()=>rej(new Error("read failed"));
        r.readAsDataURL(file);
      });
      newPreviews.push(URL.createObjectURL(file));
      setScanMsg(`识别中… (${newPreviews.length}/${files.length})`);
      try{
        const parsed=await recogniseReceipt(b64,mediaType);
        parsed.forEach(p=>{
          allItems.push({id:uid(),
            name:(p.name_zh||"")+(p.name_en?` / ${p.name_en}`:""),
            price:Number(p.price)||0,discount:Number(p.discount)||0,
            vat:p.vat==="A"?"A":"Z",splits:{xyd:0,zxb:0,zxy:0}});
        });
      }catch(e){
        setScanMsg("❌ 识别失败，请检查API Key或重试");
        setScanning(false); return;
      }
    }
    setPreviews(prev=>[...prev,...newPreviews]);
    setItems(prev=>[...prev.filter(it=>it.name||it.price>0),...allItems]);
    setScanMsg(`✅ 识别了 ${allItems.length} 件商品！`);
    setScanning(false);
    setTimeout(()=>setTab("items"),1000);
  }

  const tabBtn=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{
      flex:1,padding:"10px 0",border:"none",cursor:"pointer",
      fontSize:12,fontWeight:700,
      background:tab===t?"#222":"#F0F0F0",
      color:tab===t?"#fff":"#888",
      borderRadius:tab===t?10:0,transition:"all 0.2s"}}>
      {label}
    </button>
  );

  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#F0F2F5",
      fontFamily:"'Georgia',serif",paddingBottom:40}}>

      <div style={{background:"#222",color:"#fff",padding:"18px 16px 14px",textAlign:"center"}}>
        <div style={{fontSize:20,fontWeight:700,letterSpacing:1}}>🛒 买菜分账</div>
        <div style={{fontSize:10,color:"#666",marginTop:2,letterSpacing:2}}>xyd · zxb · zxy</div>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:12}}>
          {PEOPLE.map(p=>(
            <div key={p} style={{background:COLORS[p],borderRadius:16,padding:"5px 14px",
              fontSize:11,fontWeight:700,color:"#fff",textAlign:"center",minWidth:70}}>
              <div>{p}</div>
              <div style={{fontSize:13,marginTop:1}}>{fmt(owes[p])}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:3,margin:"10px 10px 0",background:"#F0F0F0",borderRadius:12,padding:3}}>
        {tabBtn("scan","📷 拍小票")}
        {tabBtn("items",`📋 商品(${items.filter(i=>i.name).length})`)}
        {tabBtn("result","💰 结算")}
      </div>

      <div style={{padding:"0 10px",marginTop:10}}>

        {tab==="scan"&&(
          <div>
            {noKey&&(
              <div style={{background:"#FFF3CD",borderRadius:12,padding:14,marginBottom:12,
                border:"1.5px solid #FFE69C"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#856404",marginBottom:6}}>⚠️ 需要设置 API Key</div>
                <div style={{fontSize:11,color:"#6C5500",lineHeight:1.6}}>
                  小票识别需要 Anthropic API Key。<br/>
                  请在 Vercel 项目设置中添加环境变量：<br/>
                  <code style={{background:"#FFF",padding:"2px 6px",borderRadius:4,
                    fontFamily:"monospace",fontSize:11}}>VITE_ANTHROPIC_API_KEY=sk-ant-...</code>
                </div>
              </div>
            )}

            <div onClick={()=>!scanning&&fileRef.current.click()} style={{
              border:"2.5px dashed #CCC",borderRadius:16,padding:"30px 20px",
              textAlign:"center",cursor:scanning?"default":"pointer",
              background:"#fff",marginBottom:12,opacity:scanning?0.7:1}}>
              <div style={{fontSize:36,marginBottom:8}}>{scanning?"⏳":"📷"}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#333",marginBottom:4}}>
                {scanning?"识别中…":"上传小票图片"}
              </div>
              <div style={{fontSize:11,color:"#AAA"}}>
                {scanning?scanMsg:"点击选择，支持多张同时上传"}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple
                style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
            </div>

            {scanMsg&&!scanning&&(
              <div style={{background:scanMsg.includes("✅")?"#E8F5EE":"#FFF3CD",
                borderRadius:10,padding:"10px 14px",marginBottom:12,
                fontSize:12,color:scanMsg.includes("✅")?"#27AE60":"#856404",
                fontWeight:600,textAlign:"center"}}>
                {scanMsg}
              </div>
            )}

            {previews.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#888",marginBottom:6,fontWeight:600}}>已上传图片</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {previews.map((src,i)=>(
                    <img key={i} src={src} alt="receipt"
                      style={{width:80,height:120,objectFit:"cover",borderRadius:8,
                        border:"1.5px solid #DDD"}}/>
                  ))}
                </div>
              </div>
            )}

            <div style={{background:"#fff",borderRadius:12,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:8}}>📌 使用步骤</div>
              {["拍小票上传（可多张）","AI自动识别商品","在「商品」页分配每人比例","在「结算」页查看转账金额"].map((tip,i)=>(
                <div key={i} style={{fontSize:11,color:"#666",marginBottom:5,display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{background:COLORS.xyd,color:"#fff",borderRadius:"50%",
                    width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:10,fontWeight:700,flexShrink:0,marginTop:1}}>{i+1}</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="items"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:10,
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:11,color:"#888",marginBottom:7,fontWeight:600}}>超市付款人</div>
              <div style={{display:"flex",gap:8}}>
                {PEOPLE.map(p=>(
                  <button key={p} onClick={()=>setPayer(p)} style={{
                    flex:1,padding:"8px 0",borderRadius:8,border:"none",
                    background:payer===p?COLORS[p]:"#F0F0F0",
                    color:payer===p?"#fff":"#888",
                    fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{fontSize:11,color:"#888",marginBottom:7,fontWeight:600,paddingLeft:2}}>
              商品列表 ({items.length} 件 · 合计 {fmt(groceryTotal)})
            </div>
            {items.map((item,i)=>(
              <ItemCard key={item.id} item={item} index={i}
                onUpdate={next=>setItems(prev=>prev.map(it=>it.id===item.id?next:it))}
                onDelete={()=>setItems(prev=>prev.filter(it=>it.id!==item.id))}/>
            ))}
            <button onClick={()=>setItems(prev=>[...prev,newItem()])} style={{
              width:"100%",padding:"11px 0",border:"2px dashed #CCC",
              borderRadius:12,background:"transparent",color:"#AAA",
              fontSize:12,cursor:"pointer",marginBottom:14}}>
              ＋ 手动添加商品
            </button>

            <div style={{fontSize:11,color:"#888",marginBottom:7,fontWeight:600,paddingLeft:2}}>
              其他费用（三人平摊）
            </div>
            {extras.map(e=>(
              <div key={e.id} style={{display:"flex",gap:6,alignItems:"center",marginBottom:8,
                background:"#fff",border:"1.5px solid #E0E0E0",borderRadius:10,padding:"8px 10px"}}>
                <input placeholder="名称（打车等）" value={e.name}
                  onChange={ev=>setExtras(prev=>prev.map(x=>x.id===e.id?{...x,name:ev.target.value}:x))}
                  style={{flex:2,padding:"5px 8px",border:"1.5px solid #EEE",borderRadius:6,fontSize:12,outline:"none"}}/>
                <input type="number" step="0.01" min="0" placeholder="£" value={e.amount||""}
                  onChange={ev=>setExtras(prev=>prev.map(x=>x.id===e.id?{...x,amount:parseFloat(ev.target.value)||0}:x))}
                  style={{flex:1,padding:"5px 8px",border:"1.5px solid #EEE",borderRadius:6,fontSize:12,outline:"none",minWidth:55}}/>
                <div style={{display:"flex",gap:3}}>
                  {PEOPLE.map(p=>(
                    <button key={p} onClick={()=>setExtras(prev=>prev.map(x=>x.id===e.id?{...x,paidBy:p}:x))}
                      style={{padding:"4px 7px",borderRadius:5,border:"none",
                        background:e.paidBy===p?COLORS[p]:"#EEE",
                        color:e.paidBy===p?"#fff":"#888",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                      {p}
                    </button>
                  ))}
                </div>
                <button onClick={()=>setExtras(prev=>prev.filter(x=>x.id!==e.id))}
                  style={{padding:"4px 7px",borderRadius:5,border:"none",
                    background:"#FFF0F0",color:"#E74C3C",fontSize:12,cursor:"pointer"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>setExtras(prev=>[...prev,newExp()])} style={{
              width:"100%",padding:"10px 0",border:"2px dashed #CCC",
              borderRadius:10,background:"transparent",color:"#AAA",fontSize:12,cursor:"pointer"}}>
              ＋ 添加其他费用
            </button>
          </>
        )}

        {tab==="result"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:10,
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:10}}>超市分摊</div>
              {PEOPLE.map(p=>(
                <div key={p} style={{display:"flex",alignItems:"center",marginBottom:8,gap:10}}>
                  <div style={{width:38,height:26,borderRadius:6,background:COLORS[p],color:"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>
                    {p}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{height:7,borderRadius:4,background:"#F0F0F0",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:COLORS[p],
                        width:`${groceryTotal>0?groceryTotals[p]/groceryTotal*100:0}%`}}/>
                    </div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,minWidth:55,textAlign:"right"}}>{fmt(groceryTotals[p])}</span>
                </div>
              ))}
              <div style={{borderTop:"1px solid #F0F0F0",paddingTop:7,marginTop:4,
                display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"#888"}}>超市总计</span>
                <span style={{fontSize:13,fontWeight:700}}>{fmt(groceryTotal)}</span>
              </div>
            </div>

            {extras.length>0&&(
              <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:10,
                boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:8}}>其他费用</div>
                {extras.map(e=>(
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:12}}>{e.name||"未命名"}</span>
                    <div>
                      <span style={{fontSize:11,color:"#888"}}>付：</span>
                      <span style={{fontSize:11,fontWeight:700,color:COLORS[e.paidBy]}}>{e.paidBy}</span>
                      <span style={{fontSize:12,marginLeft:8,fontWeight:700}}>{fmt(e.amount)}</span>
                    </div>
                  </div>
                ))}
                <div style={{borderTop:"1px solid #F0F0F0",paddingTop:7,marginTop:4,
                  display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:"#888"}}>每人平摊</span>
                  <span style={{fontSize:13,fontWeight:700}}>{fmt(extraPerPerson)}</span>
                </div>
              </div>
            )}

            <div style={{background:"#222",borderRadius:12,padding:14,marginBottom:10}}>
              <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:10,letterSpacing:1}}>💸 转账结果</div>
              {transfers.length===0?(
                <div style={{color:"#52B788",fontSize:13,textAlign:"center",padding:"8px 0"}}>✅ 无需转账</div>
              ):transfers.map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  background:"#333",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{background:COLORS[t.from],color:"#fff",
                      padding:"4px 10px",borderRadius:6,fontSize:12,fontWeight:700}}>{t.from}</span>
                    <span style={{color:"#888",fontSize:14}}>→</span>
                    <span style={{background:COLORS[t.to],color:"#fff",
                      padding:"4px 10px",borderRadius:6,fontSize:12,fontWeight:700}}>{t.to}</span>
                  </div>
                  <span style={{color:"#fff",fontSize:18,fontWeight:700}}>{fmt(t.amount)}</span>
                </div>
              ))}
            </div>

            <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:10,
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:8}}>账目明细</div>
              {PEOPLE.map(p=>(
                <div key={p} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"7px 0",borderBottom:"1px solid #F5F5F5"}}>
                  <span style={{fontSize:12,fontWeight:700,color:COLORS[p]}}>{p}</span>
                  <div style={{fontSize:11,color:"#AAA",textAlign:"center"}}>
                    <div>应付 {fmt(owes[p])}</div>
                    <div>实付 {fmt(paid[p])}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,
                    color:net[p]>0.005?"#52B788":net[p]<-0.005?"#E74C3C":"#888"}}>
                    {net[p]>0.005?"收 ":net[p]<-0.005?"转 ":""}{fmt(net[p])}
                  </span>
                </div>
              ))}
            </div>

            <button onClick={()=>{setItems([newItem()]);setExtras([]);setPayer("xyd");
              setPreviews([]);setScanMsg("");setTab("scan");}} style={{
              width:"100%",padding:"12px 0",background:"#F5F5F5",border:"none",
              borderRadius:12,color:"#888",fontSize:13,cursor:"pointer"}}>
              🔄 清空，开始新一次购物
            </button>
          </>
        )}
      </div>
    </div>
  );
}
