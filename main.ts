import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT=1e6, MAX=256, OUT=65536;
function run(p, input) {
  const s=new Int32Array(MAX), c=new Int32Array(64), m=new Int32Array(256), out=new Uint8Array(OUT), enc=new TextEncoder();
  let sp=0, cp=0, ip=0, pc=0, steps=0, len=0;
  const end=(exit,trap=null)=>({stdout:out.slice(0,len),exit,trap,steps});
  for (;;) {
    if(steps>=LIMIT)return end(10,10);
    if(pc<0||pc>=p.length)return end(9,9);
    const op=p[pc], imm=op===1?1:op===2?4:op>=0x30&&op<=0x33?2:0;
    if(![0,1,2,3,4,5,6,7,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,32,33,34,48,49,50,51,52,64,65,80,81,82,83].includes(op))return end(5,5);
    if(pc+1+imm>p.length)return end(9,9);
    let pop=0,push=0;
    if(op===1||op===2||op===82)push=1;
    else if(op===3||op===23||op===27||op===49||op===50||op===80||op===81||op===83)pop=1;
    else if(op===4) {pop=1;push=2;}
    else if(op===6) {pop=2;push=3;}
    else if(op===64) {pop=1;push=1;}
    else if(op===5) {pop=2;push=2;}
    else if((op>=16&&op<=22)||(op>=24&&op<=26)||(op>=28&&op<=30)||(op>=32&&op<=34)||op===65) {pop=2;push=1;}
    else if(op===7) {pop=3;push=3;}
    if(sp<pop)return end(2,2);
    if(sp-pop+push>MAX)return end(3,3);
    steps++;
    const next=pc+1+imm;
    const u16=p[pc+1]|p[pc+2]<<8, rel=(u16<<16)>>16;
    pc=next;
    if(op===0)return end(0);
    if(op===1)s[sp++]=(p[next-1]<<24)>>24;
    else if(op===2)s[sp++]=p[next-4]|p[next-3]<<8|p[next-2]<<16|p[next-1]<<24;
    else if(op===3)sp--;
    else if(op===4)s[sp]=s[sp++-1];
    else if(op===5){let t=s[sp-1];s[sp-1]=s[sp-2];s[sp-2]=t;}
    else if(op===6)s[sp++]=s[sp-2];
    else if(op===7){let a=s[sp-3];s[sp-3]=s[sp-2];s[sp-2]=s[sp-1];s[sp-1]=a;}
    else if(op===23)s[sp-1]=-s[sp-1]|0;
    else if(op===27)s[sp-1]=~s[sp-1];
    else if((op>=16&&op<=22)||(op>=24&&op<=26)||(op>=28&&op<=30)||(op>=32&&op<=34)){
      const b=s[sp-1],a=s[sp-2]; let r;
      switch(op){
        case 16:r=a+b|0;break; case 17:r=a-b|0;break; case 18:r=Math.imul(a,b);break;
        case 19:case 20:case 21:case 22:if(!b)return end(4,4);r=op===19?(a===-2147483648&&b===-1?a:Math.trunc(a/b)|0):op===20?(b===-1?0:a%b|0):op===21?Math.floor((a>>>0)/(b>>>0))|0:(a>>>0)%(b>>>0)|0;break;
        case 24:r=a&b;break;case 25:r=a|b;break;case 26:r=a^b;break;case 28:r=a<<(b&31);break;case 29:r=a>>(b&31);break;case 30:r=a>>>(b&31)|0;break;
        case 32:r=a===b?1:0;break;case 33:r=a<b?1:0;break;case 34:r=(a>>>0)<(b>>>0)?1:0;break;
      }
      sp-=2;s[sp++]=r;
    } else if(op>=48&&op<=52){
      if(op===49||op===50){let v=s[--sp];if(op===49?v===0:v!==0)pc=next+rel;}
      else if(op===48)pc=next+rel;
      else if(op===51){if(cp===64)return end(7,7);c[cp++]=next;pc=u16;}
      else {if(!cp)return end(8,8);pc=c[--cp];}
    } else if(op===64){const a=s[sp-1];if(a<0||a>255)return end(6,6);s[sp-1]=m[a];}
    else if(op===65){const a=s[sp-1],v=s[sp-2];if(a<0||a>255)return end(6,6);sp-=2;m[a]=v;}
    else if(op===80){const b=enc.encode(String(s[--sp]));if(len+b.length>OUT)return end(11,11);out.set(b,len);len+=b.length;}
    else if(op===81){if(len===OUT)return end(11,11);out[len++]=s[--sp]&255;}
    else if(op===82)s[sp++]=ip<input.length?input[ip++]:-1;
    else if(op===83)return end(s[--sp]&255);
  }
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input', O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
  const r=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));
  mkdirSync(join(O,id),{recursive:true});
  writeFileSync(join(O,id,'stdout.bin'),r.stdout);
  writeFileSync(join(O,id,'exit.txt'),`${r.exit}\n`);
}
