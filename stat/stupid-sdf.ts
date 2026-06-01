let nop = ()=>{};
// ac260, TODO publish to npm

export let parseSDF=(str:string,log:(x:string)=>void)=>{
  log=log||nop;
  if(typeof str!='string'){log('not string');return NaN}
  str=str.toUpperCase()
  if(!str.match(/^([A-Z]|[A-Z]\d|[D-W]\d[1-9ABC][0-3]?\d?)/)){log('format');return NaN}
  // starting from most restrictive
  let m1=str.match(/^([D-W])(\d)([1-9ABC])([0-3]?)(\d?)/);
  if(m1){log('m1');return parseYear(m1,log)}
  let m2=str.match(/^([A-Z])(\d)/);
  if(m2){log('m2');return parseLN(m2,log)}
  log('parseL');
  return parseL(str,log)
}

export let getSDF=(ts:number)=>{
  let year=ufy(ts);
  let formatter=rangeType(year);
  return formatter(ts);
}

let parseYear=(m1:any,log:any)=>{
  let[_,str,n1,mo,d1,d2]=m1;
  let ret=parseLN([_,str,n1],log);if(isNaN(ret)){return ret;}
  // mo is always present cuz otherwise it's parseLN
  ret = (new Date(ret)).setUTCMonth('123456789ABC'.indexOf(mo))
  log("pYret=",ret)
  if(!!(d1+d2)){ // '0't, ''f
    let dd=d1+(d2||'0'); let dn=+dd;
    if(d1+d2==='00'||!d1){return NaN} // P060=P0601 but P0600 is not permitted
    let ym=(new Date(ret));let mcheck=ym.getUTCMonth(); // this permits Feb30 so we check it
    ret = ym.setUTCDate(dn||1);//P060=P0601 but P061=P0610
    if(new Date(ret).getUTCMonth()!=mcheck){return NaN}
  }
  return ret//[ret,new Date(ret),...m1]
}

let parseLN=(m2:any,log:any)=>{ // here log is always defined
  let[_,str,n1]=m2;let L=parseL(str,log);let yr=ufy(L);let d1=+n1;let yfull=new Date(L);
  log("L:",L,"yr=",yr,"d1=",d1,"yfull=",yfull.toISOString());
  if(str==='A'||str==='Z'){return L}//a bit lax but ok
  // B8,B9 conflicts with C,D etc
  if(str==='B'){return d1>7?NaN:yfull.setUTCFullYear(yr+d1*100)}
  // Y0,Y1 conflicts with Netc, X
  if(str==='Y'){return d1<2?NaN:yfull.setUTCFullYear(2000+d1*100)}
  if(str==='C'||str==='X'){log("LN:CX");return yfull.setUTCFullYear(yr+d1*10)}
  // and generic
  log("LNgen");
  return yfull.setUTCFullYear(yr+d1)
}

export let parseL=(str:any,log:any)=>{
  if(str==='A'){return -Infinity}
  if(str==='B'){return +new Date('1000-01-01T00:00:00Z')}
  if(str==='C'){return +new Date('1800-01-01T00:00:00Z')}
  if(str==='X'){return +new Date('2100-01-01T00:00:00Z')}
  if(str==='Y'){return +new Date('2200-01-01T00:00:00Z')} // Y0, Y1 are invalid
  if(str==='Z'){return Infinity}
  let year=(str.charCodeAt(0)-68)*10+1900
  return +new Date(year+'-01-01T00:00:00Z')
}

export let rangeType=(year:any)=>{
  if(typeof year!='number'){return ()=>false}
  if(year<1000||year>=3000){return formatInf}
  if(year<1800||year>=2200){return formatCen}
  if(year<1900||year>=2100){return formatDec}
  //year>=1900 && year<2100
  return formatYear
}

export let formatYear=(ts:number)=>{
  let d=new Date(ts);let yr=d.getUTCFullYear();let mo=d.getUTCMonth()
  // letter
  let decadeSince1900=(yr/10|0)-190; let letter = String.fromCharCode(68+decadeSince1900);
  let sinceDecade=''+yr%10;
  // month
  let month='123456789ABC'[mo];
  // day
  let day=(100+d.getUTCDate()+'').substr(1)
  return letter+sinceDecade+month+day
}

export let formatDec=(ts:number)=>{
  let yr=ufy(ts); // note it's from 1000 to 3000, so... 2700>7,1700>7
  let dec=(yr%100/10|0)+''
  return ((yr>=2100)?'X':'C')+dec; // X7 as 2170-2179, C2 as 1820-1829
}

export let formatCen=(ts:number)=>{
  let yr=ufy(ts); // note it's from 1000 to 3000, so... 2700>7,1700>7
  let cen=(yr%1000/100|0)+''
  return ((yr>=2200)?'Y':'B')+cen; // Y7 as 2700-2799, B2 as 1200-1299
}

export let formatInf=(ts:number)=>(ts<0)?'A0':'Z9' // further precision undefined

export let ufy=(ts:number)=>(new Date(ts)).getUTCFullYear()

